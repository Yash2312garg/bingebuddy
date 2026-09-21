#!/usr/bin/env bash
# ============================================================
# BingeBuddy — Local Staging Setup Script
# 
# Run this ONCE to set up your local kind cluster with ArgoCD.
# After this, everything is automated via GitHub Actions + ArgoCD.
#
# Prerequisites (install via brew first):
#   brew install kubectl helm argocd
#
# Usage:
#   chmod +x k8s/setup-cluster.sh
#   ./k8s/setup-cluster.sh
# ============================================================

set -euo pipefail

CLUSTER_NAME="bingebuddy-cluster"
NAMESPACE="bingebuddy-dev"
ARGOCD_VERSION="stable"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   BingeBuddy — Local Staging Cluster Setup          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Check prerequisites ─────────────────────────────
echo "📋 Checking prerequisites..."
for cmd in kind kubectl helm argocd; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌ '$cmd' not found. Install it: brew install $cmd"
    exit 1
  fi
done
echo "✅ All prerequisites installed"
echo ""

# ── Step 2: Create kind cluster ─────────────────────────────
echo "🔧 Creating kind cluster: $CLUSTER_NAME..."
if kind get clusters | grep -q "$CLUSTER_NAME"; then
  echo "⚠️  Cluster '$CLUSTER_NAME' already exists — skipping creation"
else
  kind create cluster --config k8s/kind-config.yaml
  echo "✅ Cluster created"
fi
echo ""

# ── Step 3: Set kubectl context ─────────────────────────────
echo "🔧 Setting kubectl context..."
kubectl cluster-info --context "kind-$CLUSTER_NAME"
echo "✅ kubectl context set to kind-$CLUSTER_NAME"
echo ""

# ── Step 4: Install nginx-ingress controller ─────────────────
echo "🔧 Installing nginx-ingress controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for admission webhook jobs to complete first (they mutate the deployment)
echo "⏳ Waiting for admission jobs to complete..."
kubectl wait --namespace ingress-nginx \
  --for=condition=complete job/ingress-nginx-admission-create \
  --timeout=120s || true
kubectl wait --namespace ingress-nginx \
  --for=condition=complete job/ingress-nginx-admission-patch \
  --timeout=120s || true

echo "⏳ Waiting for nginx-ingress controller pod to be ready (up to 3 minutes)..."
echo "   (First run takes longer due to image pull)"
if ! kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=180s; then
  echo ""
  echo "⚠️  Timed out — current pod status:"
  kubectl get pods -n ingress-nginx
  echo ""
  echo "💡 The image may still be pulling. Wait 1-2 minutes then run:"
  echo "   kubectl wait --namespace ingress-nginx --for=condition=ready pod \\"
  echo "     --selector=app.kubernetes.io/component=controller --timeout=180s"
  echo "   Then re-run this script from Step 5 onward (it will skip completed steps)."
  exit 1
fi
echo "✅ nginx-ingress ready"
echo ""

# ── Step 5: Install ArgoCD ───────────────────────────────────
echo "🔧 Installing ArgoCD..."
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd \
  -f "https://raw.githubusercontent.com/argoproj/argo-cd/$ARGOCD_VERSION/manifests/install.yaml" \
  --server-side --force-conflicts
echo "⏳ Waiting for ArgoCD server to be ready (up to 3 minutes)..."
kubectl wait --namespace argocd \
  --for=condition=available deployment/argocd-server \
  --timeout=180s
echo "✅ ArgoCD installed"
echo ""

# ── Step 6: Register your GitHub repo with ArgoCD ────────────
echo "🔧 Connecting ArgoCD to your GitHub repo..."
# Get the initial admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)

# Port-forward ArgoCD temporarily to log in via CLI
kubectl port-forward svc/argocd-server -n argocd 8081:443 &
PF_PID=$!
sleep 3

argocd login localhost:8081 \
  --username admin \
  --password "$ARGOCD_PASSWORD" \
  --insecure

# Kill the temporary port-forward
kill $PF_PID 2>/dev/null || true
echo "✅ Logged into ArgoCD"
echo ""

# ── Step 7: Apply the ArgoCD Application manifest ────────────
echo "🔧 Registering BingeBuddy app with ArgoCD..."
kubectl apply -f k8s/argocd/application.yaml
echo "✅ ArgoCD Application registered — watching stage branch"
echo ""

# ── Step 8: Add bingebuddy.local to /etc/hosts ───────────────
echo "🔧 Adding bingebuddy.local to /etc/hosts..."
if grep -q "bingebuddy.local" /etc/hosts; then
  echo "⚠️  bingebuddy.local already in /etc/hosts — skipping"
else
  echo "127.0.0.1  bingebuddy.local" | sudo tee -a /etc/hosts
  echo "✅ Added bingebuddy.local → 127.0.0.1"
fi
echo ""

# ── Done ─────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════╗"
echo "║   ✅ Setup Complete!                                 ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "║  ArgoCD UI:                                          ║"
echo "║    kubectl port-forward svc/argocd-server            ║"
echo "║      -n argocd 8081:443                              ║"
echo "║    → https://localhost:8081                          ║"
echo "║    Username: admin                                   ║"
echo "║    Password: $ARGOCD_PASSWORD"
echo "║                                                      ║"
echo "║  App URL (after first deploy):                       ║"
echo "║    http://bingebuddy.local                           ║"
echo "║                                                      ║"
echo "║  Monitor:                                            ║"
echo "║    kubectl get pods -n $NAMESPACE -w      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
