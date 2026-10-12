# Auth Service: Implementation Audit & Gap Analysis

> **Executive Summary**: This document provides a granular, line-by-line cross-reference audit of the Binge Buddy `auth-service` against the `CENTRALIZED_HYBRID_AUTH_COMPLETE_GUIDE.md` design specification. It evaluates the current codebase and Kubernetes/Docker configurations to identify completed, partial, and missing components.

---

## 1. Implemented Features & Components (Verified)

These components are fully realized in the codebase and align with the design document.

### Core Auth Mechanics
*   **OTP Generation & Verification**: Functional implementation in `login.controller.ts` and `OTPService` (`generateOTP.ts`).
    *   OTP stored securely in Redis via `OtpDao` (`otp.dao.ts`) using bcrypt hashing.
    *   Rate limiting components (max attempts and cooldown) are implemented in the DAO.
    *   Email sending is properly decoupled by emitting an event (`EventPublisher.emitEmailNotification`) via RabbitMQ instead of synchronous processing.
*   **Hybrid JWT + Session Model**:
    *   **JWT Creation**: `createwebtokens.ts` provides `Restaurant_JWT` which correctly signs `accessToken` (15m) and `refreshToken` (7d).
    *   **Redis Session Creation**: `RestaurantLoginSession.ts` correctly creates short-lived (`15m`) tracking sessions using `express-session` backed by `connect-redis`.
    *   **Cookie Management**: `AuthCookies` (`auth.cookies.ts`) successfully sets secure, HTTP-only cookies for both tokens.
*   **Token Refresh Flow**: `refresh.controller.ts` successfully verifies the refresh token, checks it against Redis (`refreshTokenDao.ts`), and issues new access and refresh tokens.
*   **Logout Flow**: `logout.controller.ts` successfully deletes the refresh token from Redis and clears cookies.

### Service Infrastructure & K8s Topology
*   **NGINX Gateway Protection (Sub-Request Pattern)**: The `bingebuddy-ingress-protected` Ingress correctly implements `nginx.ingress.kubernetes.io/auth-url` pointing to `http://auth-service.bingebuddy-dev.svc.cluster.local:3002/auth/v1/restaurant/validate-session`.
*   **Database Connections**: PostgreSQL, Redis, and RabbitMQ connections are successfully established in `index.ts`.
*   **Container Deployments**: Deployment and Service manifests exist for `auth-service`, `auth-postgres`, `redis`, and `rabbitmq`.

### Endpoints & Routes (Verified)
*   `POST /auth/v1/restaurant/login`: Initiates OTP flow.
*   `POST /auth/v1/restaurant/verifyOtp`: Validates OTP and issues JWT/Sessions.
*   `POST /auth/v1/restaurant/resendOtp`: Resends OTP email.
*   `POST /auth/v1/restaurant/logout`: Destroys session tokens.
*   `POST /auth/v1/restaurant/refresh`: Refreshes expired access tokens.
*   `GET /auth/v1/restaurant/validate-session`: Endpoint called by NGINX Ingress to validate requests.

---

## 2. Partial / In-Progress Implementations

These components exist but require refinement, bug fixes, or lack production-ready configuration.

*   **`validate-session` Logic (CRITICAL FLAW)**:
    *   **Current State**: `validateSessionGateway` in `login.controller.ts` currently checks for `req.session.otpIdentifier`. This is a *pre-login* OTP tracking session, NOT an authenticated user session.
    *   **Design Spec**: The gateway should validate the `accessToken` (JWT), ensure it hasn't expired, and potentially verify a long-lived Redis session ID linked within that JWT.
    *   **Gap**: If a user completes login, their `otpIdentifier` session is destroyed (via `OTPService.clear`), meaning subsequent calls to `validate-session` will return `401 Unauthorized`. The gateway is completely broken for authenticated users.
*   **Role & Permission Middleware**:
    *   **Current State**: The guide specifies injecting `X-User-ID`, `X-User-Email`, `X-User-Role`, and `X-User-Permissions` into headers.
    *   **Gap**: `validateSessionGateway` currently only injects `X-Session-Identifier` and `X-Session-Type`. It does not extract user data from a JWT to pass downstream.
*   **Backend Service `extractUser` Middleware**:
    *   **Current State**: The guide mandates that backend services (Main App, Notif Service) simply read `X-User-*` headers injected by NGINX.
    *   **Gap**: The `server` and `notification-service` are missing the `extractUser` middleware to seamlessly trust and parse these NGINX headers.
*   **Hardcoded JWT Secrets**: `createwebtokens.ts` provides fallback hardcoded strings (`"asdasldklkmpekmdaomsdpaomsd"`) if env vars are missing. While acceptable for local dev, this is risky if the env var fails to mount in K8s.

---

## 3. Pending / Missing Requirements (Gap Analysis)

These are features defined in the `CENTRALIZED_HYBRID_AUTH_COMPLETE_GUIDE.md` (or standard K8s best practices) that have **zero implementation**.

### Architectural Gaps
*   **Dynamic Permission Updates**: The guide discusses a flow where an Admin updates permissions, modifying the Redis session, so the next request instantly gets new headers. There is no `PermissionService` or endpoint to handle this.
*   **NGINX Lua Middleware**:
    *   The design doc explicitly states: *Lua middleware: 1. Extract JWT 2. Verify signature 3. Check expiry 4. Call auth-service*.
    *   Currently, the Ingress uses a simple `auth-url` sub-request. To achieve fast, local JWT validation *before* hitting the auth-service (as described in the guide's "Hybrid Advantage"), Lua scripting must be injected into the NGINX Ingress configuration via `nginx.ingress.kubernetes.io/configuration-snippet` or a custom NGINX template.

### Infrastructure & Ops Gaps
*   **NetworkPolicies**: Currently, all pods can talk to all other pods. A compromised `client` pod could directly query `auth-postgres`.
*   **Pod Disruption Budgets (PDB)**: Missing. While running 1 replica locally, PDBs are required for production HA during node draining.
*   **Horizontal Pod Autoscaler (HPA)**: Missing.
*   **Ingress Rate Limiting**: The guide mentions `RATE_LIMIT_CONFIG`, but it is commented out in `generateOTP.ts`. NGINX ingress rate-limiting annotations (`nginx.ingress.kubernetes.io/limit-rps`) are missing from the auth routes to prevent brute-force OTP requests.

---

## 4. Implementation Readiness Matrix

| Component / Feature | Design Spec Requirement | Current Status | Key Code Reference / Missing File |
| :--- | :--- | :--- | :--- |
| **OTP Generation & Email** | Generate, store in Redis, send email | ✅ Done | `login.controller.ts`, `OTPService` |
| **JWT Creation** | Issue 15m Access Token & 7d Refresh Token | ✅ Done | `createwebtokens.ts` |
| **Refresh Flow** | Validate refresh token, issue new pair | ✅ Done | `refresh.controller.ts` |
| **Ingress Sub-Request Setup** | NGINX forwards requests to `/validate-session` | ✅ Done | `k8s/ingress.yaml` (`auth-url` annotation) |
| **Session Revocation (Logout)** | Delete session/refresh token from Redis | ✅ Done | `logout.controller.ts` |
| **Auth Gateway Logic** | Validate JWT/Session and return HTTP 200/401 | ⚠️ Partial | `validateSessionGateway` (Validates wrong session type) |
| **Header Injection** | Inject `X-User-Role`, `X-User-Email` for downstream | ⚠️ Partial | `validateSessionGateway` (Missing user data injection) |
| **Downstream User Extraction** | Backend services read `X-User-*` headers | ❌ Missing | Needs `extractUser.ts` in `server`/`notification-service` |
| **NGINX Lua JWT Validation** | Fast, local JWT validation inside NGINX | ❌ Missing | Needs Lua configuration in Ingress |
| **Permission Management** | Endpoints to dynamically update user permissions | ❌ Missing | Missing `PermissionService` |
| **Rate Limiting** | Limit OTP generation/verification requests | ❌ Missing | Rate limiter logic commented out; Missing Ingress limits |

---

## 5. Prioritized Action Plan

To bring the implementation to 100% parity with the design document, execute the following steps in order:

1.  **Refactor `validateSessionGateway` (CRITICAL)**:
    *   Rewrite `validateSessionGateway` in `login.controller.ts` to expect an `Authorization: Bearer <token>` header.
    *   It must verify the `accessToken` using `Restaurant_JWT.verifyAccessToken()`.
    *   Extract the user details (email, reference_id) from the decoded JWT payload.
    *   Map these details to `X-User-Email`, `X-User-Reference-ID`, etc., in the response headers.
2.  **Implement `extractUser` Middleware in Downstream Services**:
    *   Create a middleware in the `server` (and future services) that reads `req.headers['x-user-email']` and populates a custom `req.user` object.
    *   Apply this middleware to all protected routes in the backend services.
3.  **Implement Ingress Rate Limiting**:
    *   Update the `k8s/ingress.yaml` to include annotations like `nginx.ingress.kubernetes.io/limit-rps` and `limit-connections` specifically for the `/auth/v1/restaurant/login` and `verifyOtp` paths to prevent brute-forcing.
4.  **Evaluate Lua vs. Sub-Request Architecture**:
    *   Decide if the pure `auth-url` sub-request (current state) is sufficient, or if the Lua-based JWT pre-validation (defined in the guide) is strictly necessary for performance. If Lua is required, a custom NGINX ConfigMap must be deployed to inject the Lua scripts.
5.  **Implement RBAC & Dynamic Permissions**:
    *   Design the database schema for user roles and permissions in `auth-postgres`.
    *   Create endpoints to update permissions and ensure these updates are reflected in the JWT payload or Redis session data evaluated by the gateway.
6.  **Harden Infrastructure (Production Readiness)**:
    *   Implement K8s `NetworkPolicies` to restrict database access strictly to their owning services.
    *   Add `HorizontalPodAutoscaler` and `PodDisruptionBudget` manifests for all stateless applications.
    *   Remove hardcoded fallback secrets in `createwebtokens.ts` and ensure they crash the app if missing on startup.
