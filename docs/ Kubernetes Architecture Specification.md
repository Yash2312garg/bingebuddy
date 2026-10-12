# Binge Buddy — Exhaustive Kubernetes Architecture Specification

> **Document Purpose**: This is a production-grade reverse-engineering analysis of every Kubernetes resource, configuration parameter, architectural decision, and runtime mechanic deployed for the Binge Buddy application. An engineer should be able to fully recreate or audit the entire system from this document alone.

---

## Table of Contents

1. [High-Level Architecture & Communication Topology](#1-high-level-architecture--communication-topology)
2. [Workload & Pod Topology Strategy](#2-workload--pod-topology-strategy)
3. [Architectural Decisions, Strategy & Trade-offs](#3-architectural-decisions-strategy--trade-offs)
4. [Concrete Runtime Configurations & Parameter Specs](#4-concrete-runtime-configurations--parameter-specs)
5. [Production Kubernetes Manifest Snippets](#5-production-kubernetes-manifest-snippets)

---

## 1. High-Level Architecture & Communication Topology

### 1.1 Service Topology & Component Map

The system is deployed as a **microservices architecture** within a single Kubernetes namespace (`bingebuddy-dev`) running on a local [Kind](https://kind.sigs.k8s.io/) cluster.

```mermaid
graph TB
    subgraph "Developer Machine (macOS ARM64)"
        Browser["Browser<br/>bingebuddy.local:8080"]
        PF["kubectl port-forward<br/>localhost:8080 → ingress:80"]
    end

    subgraph "Kind Cluster"
        subgraph "Control Plane Node"
            IC["NGINX Ingress Controller<br/>Ports: 80, 443"]
        end

        subgraph "Worker Node — bingebuddy-dev namespace"
            subgraph "Application Services"
                CLIENT["client<br/>React + NGINX<br/>Port 80"]
                SERVER["server<br/>Express/Node.js<br/>Port 3000"]
                AUTH["auth-service<br/>Express/Node.js<br/>Port 3002"]
                NOTIF["notification-service<br/>Express/Node.js<br/>Port 3001"]
            end

            subgraph "Data Stores"
                SP["server-postgres<br/>PostgreSQL 15<br/>Port 5432"]
                AP["auth-postgres<br/>PostgreSQL 15<br/>Port 5432"]
                NP["notification-postgres<br/>PostgreSQL 15<br/>Port 5432"]
                REDIS["redis<br/>Redis 7.2<br/>Port 6379"]
            end

            subgraph "Message Broker"
                RMQ["rabbitmq<br/>RabbitMQ 3<br/>AMQP: 5672 | Mgmt: 15672"]
            end
        end
    end

    Browser --> PF --> IC
    IC -->|"/auth/*"| AUTH
    IC -->|"/restaurant/*"| SERVER
    IC -->|"/api/v1/notifications/*"| NOTIF
    IC -->|"/* (fallback)"| CLIENT

    AUTH --> AP
    AUTH --> REDIS
    AUTH --> RMQ
    SERVER --> SP
    SERVER --> REDIS
    SERVER --> RMQ
    NOTIF --> NP
    NOTIF --> RMQ
```

### 1.2 Complete Resource Inventory

| Resource Kind | Name | Image | Port(s) | Replicas |
|---|---|---|---|---|
| Deployment | `client` | `ghcr.io/yash2312garg/bingebuddy-client:<sha>` | 80 | 1 |
| Deployment | `server` | `ghcr.io/yash2312garg/bingebuddy-server:<sha>` | 3000 | 1 |
| Deployment | `auth-service` | `ghcr.io/yash2312garg/bingebuddy-auth-service:<sha>` | 3002 | 1 |
| Deployment | `notification-service` | `ghcr.io/yash2312garg/bingebuddy-notification-service:<sha>` | 3001 | 1 |
| StatefulSet | `server-postgres` | `postgres:15-alpine` | 5432 | 1 |
| StatefulSet | `auth-postgres` | `postgres:15-alpine` | 5432 | 1 |
| StatefulSet | `notification-postgres` | `postgres:15-alpine` | 5432 | 1 |
| StatefulSet | `redis` | `redis:7.2-alpine` | 6379 | 1 |
| StatefulSet | `rabbitmq` | `rabbitmq:3.13-management-alpine` | 5672, 15672 | 1 |
| StorageClass | `local-path-retain` | — | — | — |
| CronJob | `notification-partition-maintenance` | `postgres:15-alpine` | — | Schedule: `0 3 1 * *` |
| PersistentVolumeClaim | `postgres-data-server-postgres-0` | — | — | 2Gi (Bound via local-path-retain) |
| PersistentVolumeClaim | `postgres-data-auth-postgres-0` | — | — | 1Gi (Bound via local-path-retain) |
| PersistentVolumeClaim | `postgres-data-notification-postgres-0` | — | — | 1Gi (Bound via local-path-retain) |
| PersistentVolumeClaim | `data-redis-0` | — | — | 512Mi (Bound via local-path-retain) |
| PersistentVolumeClaim | `data-rabbitmq-0` | — | — | 1Gi (Bound via local-path-retain) |
| Service (ClusterIP) | `client` | — | 80→80 | — |
| Service (ClusterIP) | `server` | — | 3000→3000 | — |
| Service (ClusterIP) | `auth-service` | — | 3002→3002 | — |
| Service (ClusterIP) | `notification-service` | — | 3001→3001 | — |
| Service (ClusterIP) | `server-postgres` | — | 5432→5432 | — |
| Service (ClusterIP) | `auth-postgres` | — | 5432→5432 | — |
| Service (ClusterIP) | `notification-postgres` | — | 5432→5432 | — |
| Service (ClusterIP) | `redis` | — | 6379→6379 | — |
| Service (ClusterIP) | `rabbitmq` | — | 5672, 15672 | — |
| Ingress | `bingebuddy-ingress-default` | — | — | — |
| Ingress | `bingebuddy-ingress-sse` | — | — | — |
| Ingress | `bingebuddy-ingress-protected` | — | — | — |
| ConfigMap | `server-config` | — | — | — |
| ConfigMap | `auth-config` | — | — | — |
| ConfigMap | `notification-config` | — | — | — |
| ConfigMap | `server-postgres-init` | — | — | — |
| ConfigMap | `auth-postgres-init` | — | — | — |
| ConfigMap | `notification-postgres-init` | — | — | — |
| Secret | `server-secrets` | — | — | — |
| Secret | `auth-secrets` | — | — | — |
| Secret | `notification-secrets` | — | — | — |
| Secret | `ghcr-secret` | — | — | — |
| Namespace | `bingebuddy-dev` | — | — | — |
| ArgoCD Application | `bingebuddy-staging` | — | — | — |

**Total Pod footprint**: 9 active pods (4 stateless Deployments + 5 StatefulSets with persistent storage) + 1 scheduled CronJob.

### 1.3 Inter-Service Communication Mechanisms

#### Internal Routing (East-West Traffic)

All inter-service communication uses **Kubernetes ClusterIP Services** resolved via **CoreDNS**.

| From | To | DNS Name | Protocol | Connection String |
|---|---|---|---|---|
| `server` | `server-postgres` | `server-postgres.bingebuddy-dev.svc.cluster.local` | TCP/5432 | `postgresql://yash:***@server-postgres:5432/bingebuddy` |
| `auth-service` | `auth-postgres` | `auth-postgres.bingebuddy-dev.svc.cluster.local` | TCP/5432 | `postgresql://authadmin:***@auth-postgres:5432/auth` |
| `notification-service` | `notification-postgres` | `notification-postgres.bingebuddy-dev.svc.cluster.local` | TCP/5432 | `postgresql://admin:***@notification-postgres:5432/notifications` |
| `server` | `redis` | `redis.bingebuddy-dev.svc.cluster.local` | TCP/6379 | `redis://redis:6379` |
| `auth-service` | `redis` | `redis.bingebuddy-dev.svc.cluster.local` | TCP/6379 | `redis://redis:6379` |
| `server` | `rabbitmq` | `rabbitmq.bingebuddy-dev.svc.cluster.local` | AMQP/5672 | `amqp://yash:Yash@123@rabbitmq:5672` |
| `auth-service` | `rabbitmq` | `rabbitmq.bingebuddy-dev.svc.cluster.local` | AMQP/5672 | `amqp://yash:Yash@123@rabbitmq:5672` |
| `notification-service` | `rabbitmq` | `rabbitmq.bingebuddy-dev.svc.cluster.local` | AMQP/5672 | `amqp://yash:Yash@123@rabbitmq:5672` |
| Ingress (auth sub-request) | `auth-service` | `auth-service.bingebuddy-dev.svc.cluster.local` | HTTP/3002 | Full FQDN used in `auth-url` annotation |

> [!NOTE]
> Because all services live in the same namespace (`bingebuddy-dev`), short-form DNS names like `redis` resolve correctly without the full FQDN. The exception is the Ingress `auth-url` annotation, which must use the FQDN because the Ingress Controller runs in a different namespace (`ingress-nginx`).

#### External Routing (North-South Traffic)

```
Browser → localhost:8080 → (kubectl port-forward) → ingress-nginx-controller:80 → Ingress Rules → Backend Services
```

All external traffic enters through a single entrypoint: the NGINX Ingress Controller, accessed via `kubectl port-forward`. There is no LoadBalancer or NodePort service exposed externally.

#### Communication Protocols per Path

| Path | Protocol | Notes |
|---|---|---|
| Browser ↔ Ingress | HTTP/1.1 | No TLS termination configured (port 80 only) |
| Ingress ↔ Application Services | HTTP/1.1 REST | JSON request/response bodies |
| Browser ↔ notification-service (via Ingress) | HTTP/1.1 SSE | Long-lived `text/event-stream` connection |
| Application ↔ PostgreSQL | TCP (libpq wire protocol) | Binary PostgreSQL protocol over TCP |
| Application ↔ Redis | TCP (RESP protocol) | Redis Serialization Protocol |
| Application ↔ RabbitMQ | TCP (AMQP 0-9-1) | Advanced Message Queuing Protocol |

### 1.4 Traffic Control & Security Policies

| Category | Implementation |
|---|---|
| **NetworkPolicies** | ❌ Not implemented. All pods can communicate freely within the namespace. |
| **TLS Termination** | ❌ Not implemented. All traffic is plaintext HTTP. Port 443 is mapped in Kind config for future use. |
| **mTLS / Service Mesh** | ❌ Not implemented. No Istio, Linkerd, or similar sidecar proxy. |
| **CORS** | ✅ Handled at the Ingress level via annotations: `cors-allow-origin: "*"`, `cors-allow-credentials: "true"`. |
| **Pod Security Context** | ✅ Application pods run as `runAsNonRoot: true, runAsUser: 1001` (except `client` which requires root for NGINX port 80). `allowPrivilegeEscalation: false` on all pods. |

---

## 2. Workload & Pod Topology Strategy

### 2.1 Primitive Selection & Inventory

The cluster uses a **hybrid workload strategy**: stateless HTTP frontends/backends use `Deployment` with zero-downtime rolling updates, stateful data stores and brokers use `StatefulSet` with `volumeClaimTemplates` to guarantee persistent identity and prevent multi-attach directory corruption, and background schema maintenance uses a `CronJob`.

| Workload | Primitive | Replicas | Strategy / Retention | terminationGracePeriodSeconds | PVC Template / Size |
|---|---|---|---|---|---|
| `client` | Deployment | 1 | RollingUpdate (maxSurge=1, maxUnavail=0) | 10 | — |
| `server` | Deployment | 1 | RollingUpdate (maxSurge=1, maxUnavail=0) | 30 | — |
| `auth-service` | Deployment | 1 | RollingUpdate (maxSurge=1, maxUnavail=0) | 30 | — |
| `notification-service` | Deployment | 1 | RollingUpdate (maxSurge=1, maxUnavail=0) | 30 | — |
| `server-postgres` | StatefulSet | 1 | RollingUpdate / Retain PVC | 60 (with fast preStop) | `postgres-data` (2Gi) |
| `auth-postgres` | StatefulSet | 1 | RollingUpdate / Retain PVC | 60 (with fast preStop) | `postgres-data` (1Gi) |
| `notification-postgres` | StatefulSet | 1 | RollingUpdate / Retain PVC | 60 (with fast preStop) | `postgres-data` (1Gi) |
| `redis` | StatefulSet | 1 | RollingUpdate / Retain PVC | 30 | `data` (512Mi) |
| `rabbitmq` | StatefulSet | 1 | RollingUpdate / Retain PVC | 60 | `data` (1Gi) |
| `notification-partition-maintenance` | CronJob | — | Schedule `0 3 1 * *` (Forbid concurrency) | default | — |

### 2.2 Scaling Mechanics

| Feature | Status |
|---|---|
| **Horizontal Pod Autoscaler (HPA)** | ❌ Not configured. All workloads are fixed at 1 replica. |
| **Vertical Pod Autoscaler (VPA)** | ❌ Not configured. |
| **Cluster Autoscaler / Karpenter** | ❌ N/A. Kind is a fixed 2-node cluster with no cloud-backed autoscaling. |
| **KEDA (Event-Driven Autoscaling)** | ❌ Not configured. RabbitMQ queue depth could trigger notification-service scaling in the future. |

### 2.3 High Availability (HA) & Scheduling Rules

| Feature | Status |
|---|---|
| **Pod Anti-Affinity** | ❌ Not configured. All application pods schedule on the single worker node. |
| **Pod Disruption Budgets (PDB)** | ❌ Not configured. |
| **Node Selectors** | ❌ Not configured (only 1 worker node exists). |
| **Tolerations / Taints** | ❌ Not configured beyond the default control-plane taint. |
| **Priority Classes** | ❌ Not configured. |

> [!IMPORTANT]
> The HA posture is minimal because this is a **local development/staging environment** on Kind. The cluster has exactly 2 nodes: 1 control-plane (running Ingress Controller) and 1 worker (running all 9 application pods). All pods are co-located on the single worker node with IP range `10.244.1.x`.

### 2.4 Kind Cluster Topology

```yaml
# cluster/kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: bingebuddy-cluster

nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"   # Required for NGINX Ingress scheduling
    extraPortMappings:
      - containerPort: 80       # HTTP
        hostPort: 80
        protocol: TCP
      - containerPort: 443      # HTTPS (reserved for future TLS)
        hostPort: 443
        protocol: TCP
  - role: worker                # All BingeBuddy pods run here
```

**Key Decisions**:
- `ingress-ready=true` label on the control-plane node ensures the NGINX Ingress DaemonSet schedules there, giving it access to the `extraPortMappings`.
- Port 80/443 are mapped from the Docker container (Kind node) to the host (macOS), but access is via `kubectl port-forward` on port 8080 instead — avoiding the need for root/sudo to bind privileged port 80 on macOS.

---

## 3. Architectural Decisions, Strategy & Trade-offs

### 3.1 Primitive Selection Rationale

| Component | Chosen Primitive | Rationale |
|---|---|---|
| **PostgreSQL** (×3) | `StatefulSet` | Persistent identity and single-mount safety. Prevents multi-attach directory corruption that occurs with Deployments during pod deletion/eviction. Uses `volumeClaimTemplates` (2Gi for server, 1Gi for auth/notification) bound to `local-path-retain`. Employs `preStop` fast shutdown (`su-exec postgres pg_ctl -D "$PGDATA" -m fast -w -t 50 stop`) within a 60s termination budget to checkpoint cleanly and avoid crash recovery delays. |
| **Redis** | `StatefulSet` | Persistent AOF storage with 512Mi PVC. Configured with `--appendonly yes`, `--appendfsync everysec`, and `--maxmemory 128mb` with `--maxmemory-policy volatile-lru` to allow fork headroom for AOF rewrites under the 256Mi container limit. Uses container `args` (not `command`) to preserve the official Docker entrypoint (chown `/data` and privilege drop). |
| **RabbitMQ** | `StatefulSet` | Persistent Mnesia storage with 1Gi PVC. Enforces `RABBITMQ_NODENAME: rabbit@localhost` so Mnesia directory paths remain stable across pod recreations. Health probes use dedicated startup probes with 10s timeouts to accommodate Erlang VM startup without flapping. |
| **Application Services** (×4) | `Deployment` | Stateless HTTP servers — the canonical use case for Deployments with zero-downtime rolling updates. |
| **Partition Maintenance** | `CronJob` | Scheduled maintenance for time-partitioned audit tables (`notification_delivery_logs`), ensuring partitions are pre-created months in advance. |

### 3.2 Deployment & Rollout Strategy

All 4 application services use identical rollout parameters:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0    # Never kill the old pod before the new one is ready
    maxSurge: 1          # Allow at most 1 extra pod during rollout
```

**Decision Analysis**:
- `maxUnavailable: 0` guarantees **zero-downtime deployments**. The old pod continues serving traffic until the new pod passes its readinessProbe.
- `maxSurge: 1` means during a rollout, the cluster briefly runs 2 pods (old + new). This doubles resource consumption momentarily but ensures seamless handoff.
- Combined with `terminationGracePeriodSeconds: 30`, the old pod gets 30 seconds to finish in-flight requests before being killed.
- The `client` has a shorter grace period of `10s` because it serves static files via NGINX — there are no long-running requests to drain.

> [!TIP]
> The infrastructure StatefulSets (postgres, redis, rabbitmq) use `updateStrategy: RollingUpdate` with `replicas: 1`. On pod deletion or rollout, the StatefulSet controller guarantees the old pod is completely terminated and its volume unmounted before creating the replacement pod.

### 3.3 Networking Trade-offs

| Decision | Chosen | Alternative | Rationale |
|---|---|---|---|
| **Ingress** | NGINX Ingress Controller | Traefik, HAProxy, Service Mesh (Istio) | NGINX is the most mature and well-documented K8s Ingress. It supports the `auth-url` sub-request pattern needed for the gateway authentication model. |
| **Service Type** | All ClusterIP | NodePort, LoadBalancer | ClusterIP is the correct choice for a Kind cluster. NodePort wastes ports; LoadBalancer requires a cloud provider or MetalLB. |
| **SSE Routing** | Separate Ingress resource with custom annotations | Same Ingress with per-path annotations | NGINX Ingress annotations apply at the **Ingress resource level**, not per-path. A dedicated Ingress was required to apply SSE-specific timeouts without affecting other routes. |
| **Auth Gateway** | `auth-url` sub-request (Ingress annotation) | Application-level middleware per service | Centralizes authentication at the edge. Backend services don't need JWT verification libraries — they trust headers injected by the Ingress after successful auth. |

### 3.4 Storage Trade-offs

| Decision | Chosen | Rationale |
|---|---|---|
| **Storage Provisioner** | `local-path-retain` (`rancher.io/local-path`) | Dedicated StorageClass configured with `reclaimPolicy: Retain` and `volumeBindingMode: WaitForFirstConsumer`. Prevents accidental data destruction upon PVC release. |
| **Data Directory Location** | `/var/local-path-provisioner/` on Kind worker | Survives pod restarts, rollouts, and Kind worker node container restarts. Mounted into containers with isolated subpaths (e.g., `PGDATA=/var/lib/postgresql/data/pgdata`). |
| **PVC Management** | StatefulSet `volumeClaimTemplates` | PVCs are decoupled from Git manifests and excluded from ArgoCD pruning. Retained automatically via `persistentVolumeClaimRetentionPolicy` (`whenDeleted: Retain`, `whenScaled: Retain`). |
| **Database Initialization** | ConfigMap mounted to `/docker-entrypoint-initdb.d` | PostgreSQL auto-executes `init.sql` **only on initial empty boot**. Once data is initialized on the persistent volume, subsequent restarts bypass `init.sql`. |
| **Time-Bomb Partition Safety** | DEFAULT partition + dynamic generator function + CronJob | Protects `notification_delivery_logs` from failing inserts past Dec 2026. A `DEFAULT` partition catches overflow, while `ensure_delivery_log_partitions` creates monthly tables 3 months ahead. |

---

## 4. Concrete Runtime Configurations & Parameter Specs

### 4.1 Configuration & Secret Management

All configuration is injected via `envFrom` which bulk-loads every key in a ConfigMap/Secret as environment variables.

#### ConfigMap: `server-config`
| Key | Value | Purpose |
|---|---|---|
| `NODE_ENV` | `staging` | Node.js environment mode |
| `PORT` | `3000` | Express server listen port |
| `DB_HOST` | `server-postgres` | CoreDNS-resolvable Kubernetes Service name |
| `DB_PORT` | `5432` | PostgreSQL wire protocol port |
| `DB_NAME` | `bingebuddy` | Target database name |
| `DB_USER` | `yash` | PostgreSQL username |
| `RABBITMQ_URL` | `amqp://yash:Yash@123@rabbitmq:5672` | Full AMQP connection string with embedded credentials |
| `REDIS_HOST` | `redis` | CoreDNS-resolvable Service name |
| `REDIS_PORT` | `6379` | Redis default port |
| `REDIS_URL` | `redis://redis:6379` | Full Redis connection URI |
| `AWS_S3_REGION` | `us-east-1` | AWS S3 bucket region for image uploads |
| `AWS_S3_BUCKET` | `bingebuddy-uploads` | S3 bucket name |
| `AUTH_SERVICE_URL` | `http://auth-service:3002` | Internal URL for token validation |
| `FRONTEND_URL` | `http://bingebuddy.local:8080` | Used for CORS origin configuration |

#### Secret: `server-secrets`
| Key | Base64 Value | Decoded Value | Purpose |
|---|---|---|---|
| `DB_PASSWORD` | `TmlzaGlAMTIz` | `Nishi@123` | PostgreSQL password |
| `JWT_SECRET` | `eW91ci1qd3Qtc2VjcmV0LWtleS1jaGFuZ2UtdGhpcw==` | `your-jwt-secret-key-change-this` | JWT signing key |
| `JWT_REFRESH_SECRET` | `eW91ci1yZWZyZXNoLXNlY3JldC1jaGFuZ2UtdGhpcw==` | `your-refresh-secret-change-this` | Refresh token signing key |

#### ConfigMap: `auth-config`
| Key | Value |
|---|---|
| `NODE_ENV` | `staging` |
| `PORT` | `3002` |
| `DB_HOST` | `auth-postgres` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `auth` |
| `DB_USER` | `authadmin` |
| `REDIS_HOST` | `redis` |
| `REDIS_PORT` | `6379` |
| `REDIS_URL` | `redis://redis:6379` |
| `RABBITMQ_URL` | `amqp://yash:Yash@123@rabbitmq:5672` |
| `FRONTEND_URL` | `http://bingebuddy.local:8080` |

#### Secret: `auth-secrets`
| Key | Decoded Value |
|---|---|
| `DB_PASSWORD` | `authadmin123` |
| `JWT_SECRET` | `your-jwt-secret-key-change-this` |
| `JWT_REFRESH_SECRET` | `your-refresh-secret-change-this` |

#### ConfigMap: `notification-config`
| Key | Value |
|---|---|
| `NODE_ENV` | `staging` |
| `PORT` | `3001` |
| `DB_HOST` | `notification-postgres` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `notifications` |
| `DB_USER` | `admin` |
| `RABBITMQ_URL` | `amqp://yash:Yash@123@rabbitmq:5672` |
| `FRONTEND_URL` | `http://bingebuddy.local:8080` |

#### Secret: `notification-secrets`
| Key | Decoded Value |
|---|---|
| `DB_PASSWORD` | `admin123` |
| `NODEMAILER_USER` | `v5tmmf2ennoca7hv@ethereal.email` |
| `NODEMAILER_USER_PASSWORD` | `Ffzj4GPA7SGaagWWDH` |

> [!WARNING]
> **Security Concern**: The `RABBITMQ_URL` in ConfigMaps contains plaintext credentials (`yash:Yash@123`). These should be moved to Secrets. Additionally, Kubernetes Secrets are only base64-encoded (NOT encrypted). In production, use `SealedSecrets`, `ExternalSecrets Operator`, or `HashiCorp Vault` for actual encryption-at-rest.

### 4.2 Resource Management Matrix

| Workload | CPU Request | CPU Limit | Mem Request | Mem Limit | QoS Class |
|---|---|---|---|---|---|
| `client` | 50m | 200m | 64Mi | 128Mi | **Burstable** |
| `server` | 100m | 500m | 128Mi | 512Mi | **Burstable** |
| `auth-service` | 100m | 500m | 128Mi | 512Mi | **Burstable** |
| `notification-service` | 100m | 500m | 128Mi | 512Mi | **Burstable** |
| `server-postgres` | 100m | 500m | 128Mi | 512Mi | **Burstable** |
| `auth-postgres` | 100m | 500m | 128Mi | 512Mi | **Burstable** |
| `notification-postgres` | 100m | 500m | 128Mi | 512Mi | **Burstable** |
| `redis` | 50m | 250m | 64Mi | 256Mi | **Burstable** |
| `rabbitmq` | 100m | 500m | 128Mi | 512Mi | **Burstable** |
| **TOTALS** | **800m** | **3,950m** | **896Mi** | **3,840Mi** | — |

> [!NOTE]
> All pods are **Burstable** QoS class because requests ≠ limits. This means under memory pressure, the kubelet may evict these pods. For production databases, set requests = limits to achieve **Guaranteed** QoS.

### 4.3 Health Monitoring Parameters

| Workload | Probe Type | Mechanism / Path | Port | initialDelay | period | failureThreshold | timeout |
|---|---|---|---|---|---|---|---|
| `client` | readiness | HTTP `/health` | 80 | 5s | 5s | 3 | 1s |
| `client` | liveness | HTTP `/health` | 80 | 10s | 10s | 3 | 1s |
| `server` | readiness | HTTP `/health` | 3000 | 10s | 5s | 3 | 1s |
| `server` | liveness | HTTP `/health` | 3000 | 30s | 10s | 3 | 1s |
| `auth-service` | readiness | HTTP `/auth/v1/health` | 3002 | 10s | 5s | 3 | 1s |
| `auth-service` | liveness | HTTP `/auth/v1/health` | 3002 | 30s | 10s | 3 | 1s |
| `notification-service` | readiness | HTTP `/health` | 3001 | 15s | 5s | 3 | 1s |
| `notification-service` | liveness | HTTP `/health` | 3001 | 30s | 10s | 3 | 1s |
| PostgreSQL (×3) | startup | `pg_isready -h 127.0.0.1 -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB"` | 5432 | — | 5s | 36 (up to 180s) | 3s |
| PostgreSQL (×3) | readiness | `pg_isready -h 127.0.0.1 -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB"` | 5432 | — | 5s | 2 | 3s |
| PostgreSQL (×3) | liveness | `pg_isready -h 127.0.0.1 -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB"` | 5432 | — | 10s | 6 | 5s |
| `redis` | startup | `redis-cli ping` | 6379 | — | 2s | 30 (up to 60s) | default |
| `redis` | readiness | `redis-cli ping` | 6379 | — | 5s | 2 | 2s |
| `redis` | liveness | `redis-cli ping` | 6379 | — | 10s | 3 | 2s |
| `rabbitmq` | startup | `rabbitmq-diagnostics -q ping` | — | — | 10s | 18 (up to 180s) | 10s |
| `rabbitmq` | readiness | `rabbitmq-diagnostics -q check_port_connectivity` | — | — | 10s | 3 | 10s |
| `rabbitmq` | liveness | `rabbitmq-diagnostics -q ping` | — | — | 30s | 3 | 15s |

**Decision Analysis**:
- `readinessProbe.initialDelaySeconds` is staggered for application pods: `client` (5s, fast NGINX boot) < `server`/`auth-service` (10s, Express + DB connection) < `notification-service` (15s, Express + RabbitMQ + DB connection).
- `pg_isready` explicitly specifies `-h 127.0.0.1`. Omitting `-h` would test the local UNIX domain socket, which is active during bootstrap initialization before TCP socket binding is opened.
- Startup probes on PostgreSQL (180s budget) and RabbitMQ (180s budget) accommodate database crash recovery checkpoints and Erlang Mnesia reconstruction without triggering premature liveness kills.
- RabbitMQ probes use relaxed intervals (`periodSeconds: 10s-30s`, `timeoutSeconds: 10s-15s`) because `rabbitmq-diagnostics` boots an Erlang CLI node per execution, which would otherwise flap under the 500m CPU limit.

### 4.4 Storage Architecture

| Component | Persistent Storage | Volume Type / PVC | Mount Path | Storage Class | Persistence Mechanism |
|---|---|---|---|---|---|
| `server-postgres` | ✅ Persistent | `postgres-data-server-postgres-0` (2Gi) | `/var/lib/postgresql/data` | `local-path-retain` | PostgreSQL WAL + data dir in `.../pgdata`; survives restarts |
| `auth-postgres` | ✅ Persistent | `postgres-data-auth-postgres-0` (1Gi) | `/var/lib/postgresql/data` | `local-path-retain` | PostgreSQL WAL + data dir in `.../pgdata`; survives restarts |
| `notification-postgres` | ✅ Persistent | `postgres-data-notification-postgres-0` (1Gi) | `/var/lib/postgresql/data` | `local-path-retain` | PostgreSQL WAL + data dir in `.../pgdata`; survives restarts |
| `redis` | ✅ Persistent | `data-redis-0` (512Mi) | `/data` | `local-path-retain` | Append-Only File (AOF) with `fsync everysec`, `maxmemory 128mb` |
| `rabbitmq` | ✅ Persistent | `data-rabbitmq-0` (1Gi) | `/var/lib/rabbitmq` | `local-path-retain` | Mnesia database with pinned node name `rabbit@localhost` |

### 4.5 Database Initialization & Partition Maintenance Strategy

Each PostgreSQL instance combines **First-Boot Initialization** with **Persistent Volume Lifecycle**:

1. A ConfigMap contains the base `init.sql` script (schema DDL + seed data) mounted into `/docker-entrypoint-initdb.d/`.
2. PostgreSQL executes `init.sql` **only once on initial volume creation** when `PGDATA` is empty.
3. On subsequent container restarts or pod rollouts, PostgreSQL detects the existing database cluster in `PGDATA` and skips re-initialization, preserving all runtime mutations.

**Audit Table Partition Maintenance (`notification_delivery_logs`)**:
1. **Safety Net Partition**: A `DEFAULT` partition (`notification_delivery_logs_default`) guarantees that unexpected insert volumes or future timestamps never throw runtime PostgreSQL range errors.
2. **Pre-emptive Generation Function**: Stored procedure `ensure_delivery_log_partitions(months_ahead int DEFAULT 3)` dynamically checks and creates missing tables formatted as `logs_yYYYYmMM`.
3. **Automated Monthly CronJob**: `k8s/infra/notification-partition-cron.yaml` runs on the 1st of every month at 03:00 UTC (`0 3 1 * *`) via `postgres:15-alpine` invoking `SELECT ensure_delivery_log_partitions(3);`.

**Database Schemas**:

| Database | Tables | Key Features |
|---|---|---|
| `auth` (auth-postgres) | `restaurant_accounts` | UUID PKs via `pgcrypto`, `auth_status_enum`, auto-updating `updated_at` triggers, 3 seed restaurants |
| `bingebuddy` (server-postgres) | `restaurant_details`, `restaurant_addresses`, `restaurant_hours`, `menu`, `categories`, `menue_items`, `item_availability`, `variants`, `variant_options`, `item_variants`, `addons`, `item_addons` | Full relational schema with FK cascading deletes, 3 restaurants, 10 menus, 25 items, variants, addons. Sequence resets after seed data. |
| `notifications` (notification-postgres) | `notification_templates`, `user_preferences`, `in_app_notifications`, `notification_delivery_logs` | **Partitioned table** (`notification_delivery_logs`) using `PARTITION BY RANGE (created_at)` with monthly partitions from June 2026 to December 2026. HTML email template stored as seed data. |

---

## 5. Production Kubernetes Manifest Snippets

### 5.1 Ingress — Three-Tier Routing Architecture

The Ingress is split into 3 separate resources because NGINX Ingress annotations are **resource-scoped** (not path-scoped).

#### Default Ingress — Public Routes
```yaml
# Path-based routing: most-specific wins, then longest path
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bingebuddy-ingress-default
  namespace: bingebuddy-dev
  annotations:
    kubernetes.io/ingress.class: "nginx"
    # CORS: Allow all origins (dev only — lock down in production)
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "*"
    nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
spec:
  rules:
    - http:
        paths:
          - path: /auth              # → auth-service:3002
            pathType: Prefix
          - path: /restaurant        # → server:3000
            pathType: Prefix
          - path: /                  # → client:80 (fallback)
            pathType: Prefix
```

#### SSE Ingress — Long-Lived Connections
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bingebuddy-ingress-sse
  annotations:
    # These 3 annotations are WHY this needs a separate Ingress:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"   # 1 hour
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"   # 1 hour
    nginx.ingress.kubernetes.io/proxy-buffering: "off"       # Stream data immediately
spec:
  rules:
    - http:
        paths:
          - path: /api/v1/notifications   # → notification-service:3001
            pathType: Prefix
```

#### Protected Ingress — Auth Gateway (Sub-Request Pattern)
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bingebuddy-ingress-protected
  annotations:
    # NGINX makes a sub-request to this URL before forwarding to the backend.
    # If auth-service returns 2xx → request proceeds.
    # If auth-service returns 401/403 → NGINX rejects with that status.
    nginx.ingress.kubernetes.io/auth-url: >-
      http://auth-service.bingebuddy-dev.svc.cluster.local:3002/auth/v1/restaurant/validate-session
    # These headers from the auth response are forwarded to the backend service:
    nginx.ingress.kubernetes.io/auth-response-headers: >-
      X-Session-Identifier, X-Session-Type, X-Session-Generated-At
spec:
  rules:
    - http:
        paths:
          - path: /restaurant/prelogin    # → server:3000 (after auth check)
            pathType: Prefix
```

### 5.2 Application Deployment — Full Annotated Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: server
  namespace: bingebuddy-dev
  labels:
    app: server
    app.kubernetes.io/managed-by: argocd    # ArgoCD ownership tracking
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0    # Zero-downtime: never kill old before new is ready
      maxSurge: 1          # Allow 1 extra pod during rollout
  selector:
    matchLabels:
      app: server          # Must match template.metadata.labels
  template:
    metadata:
      labels:
        app: server        # Service selector + ReplicaSet ownership
    spec:
      terminationGracePeriodSeconds: 30    # Time to drain in-flight requests
      imagePullSecrets:
        - name: ghcr-secret                # Docker registry auth for GHCR
      containers:
        - name: server
          image: ghcr.io/yash2312garg/bingebuddy-server:22d874c  # CI-managed SHA tag
          imagePullPolicy: Always           # Always pull (needed for :latest + SHA tags)
          ports:
            - name: http
              containerPort: 3000
              protocol: TCP
          envFrom:
            - configMapRef:
                name: server-config         # All non-sensitive env vars
            - secretRef:
                name: server-secrets        # Sensitive env vars (passwords, JWT keys)
          readinessProbe:                   # Gate for receiving traffic
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:                    # Trigger for pod restart
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          securityContext:
            runAsNonRoot: true              # Container must not run as UID 0
            runAsUser: 1001                 # The 'nodejs' user created in Dockerfile
            allowPrivilegeEscalation: false # Prevent setuid binaries
            readOnlyRootFilesystem: false   # Node.js needs to write to /tmp
```

### 5.3 GitOps — ArgoCD Application CRD

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: bingebuddy-staging
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io   # Cascade delete on removal
spec:
  project: default
  source:
    repoURL: https://github.com/Yash2312garg/bingebuddy
    targetRevision: stage              # Watch the 'stage' branch
    path: k8s                          # Apply all YAML files in k8s/ directory
    directory:
      recurse: true                    # Include k8s/apps/, k8s/infra/, k8s/argocd/
  destination:
    server: https://kubernetes.default.svc   # Deploy to "this" cluster
    namespace: bingebuddy-dev
  syncPolicy:
    automated:
      prune: true         # Delete K8s resources that were removed from Git
      selfHeal: true       # Revert manual kubectl changes back to Git state
    syncOptions:
      - CreateNamespace=true               # Auto-create namespace if missing
      - PrunePropagationPolicy=foreground  # Wait for dependent resources to delete
      - PruneLast=true                     # Delete old resources AFTER new ones are ready
  ignoreDifferences:
    - group: apps
      kind: StatefulSet
      jsonPointers:
        - /spec/volumeClaimTemplates       # Prevents OutOfSync flapping on defaulted PVC template fields
```

**ArgoCD Sync Flow**:
1. Developer pushes code to `stage` branch.
2. GitHub Actions CI builds Docker images, pushes to GHCR.
3. CI commits updated image tags (SHA) back to `k8s/apps/*/deployment.yaml` with `[skip ci]` to prevent infinite loops.
4. ArgoCD detects the Git diff within its 3-minute polling interval.
5. ArgoCD applies the updated manifests, triggering a RollingUpdate.
6. `selfHeal: true` ensures any manual `kubectl` changes are reverted to match Git.
7. `prune: true` ensures deleted manifest files result in deleted K8s resources.

### 5.4 CI/CD Pipeline — GitHub Actions

The pipeline is a **2-job workflow** triggered on pushes to `stage`:

**Job 1: `build-and-push`**
- Builds all 4 service Docker images using `docker/build-push-action@v5`
- Multi-architecture: `linux/amd64,linux/arm64` (supports both Intel CI runners and ARM64 Kind cluster)
- Uses GitHub Actions cache (`type=gha`) for layer caching
- Tags: `<sha-short>` + `latest`
- Registry: `ghcr.io/yash2312garg/`

**Job 2: `update-manifests`** (depends on Job 1)
- Uses `sed` to replace image tags in all 4 `deployment.yaml` files
- Commits with `[skip ci]` to prevent recursive pipeline triggers
- This is the **GitOps commit** that ArgoCD picks up

```
Push to stage → CI builds images → CI updates manifests in Git → ArgoCD syncs → K8s rolling update
```
