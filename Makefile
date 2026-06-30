# ============================================================
# BingeBuddy — Makefile
# Usage: make <target>
# ============================================================

COMPOSE         := docker compose
COMPOSE_PROD    := docker compose --profile prod
PROJECT_NAME    := bingebuddy

# Colours for terminal output
CYAN  := \033[0;36m
RESET := \033[0m
BOLD  := \033[1m

.DEFAULT_GOAL := help

# ── Help ─────────────────────────────────────────────────────────────────────

.PHONY: help
help:
	@echo ""
	@echo "$(BOLD)BingeBuddy — available commands$(RESET)"
	@echo ""
	@echo "  $(CYAN)make dev$(RESET)            Start full dev stack (gateway + both services + all DBs)"
	@echo "  $(CYAN)make dev-build$(RESET)      Rebuild images then start dev stack"
	@echo "  $(CYAN)make prod$(RESET)           Start full prod stack"
	@echo "  $(CYAN)make prod-build$(RESET)     Rebuild images then start prod stack"
	@echo ""
	@echo "  $(CYAN)make kill-ports$(RESET)     Free ports 9229/9230 after a crash, then re-run make dev-build"
	@echo "  $(CYAN)make stop$(RESET)           Stop all running containers"
	@echo "  $(CYAN)make down$(RESET)           Stop and remove containers + networks"
	@echo "  $(CYAN)make clean$(RESET)          down + remove named volumes (destroys DB data)"
	@echo "  $(CYAN)make prune$(RESET)          clean + remove dangling images"
	@echo ""
	@echo "  $(CYAN)make logs$(RESET)           Tail logs for all services"
	@echo "  $(CYAN)make logs-gateway$(RESET)   Tail gateway logs only"
	@echo "  $(CYAN)make logs-app$(RESET)       Tail main-app logs only"
	@echo "  $(CYAN)make logs-notif$(RESET)     Tail notification-service logs only"
	@echo ""
	@echo "  $(CYAN)make ps$(RESET)             Show running containers and health"
	@echo "  $(CYAN)make shell-app$(RESET)      Open shell inside main-app container"
	@echo "  $(CYAN)make shell-notif$(RESET)    Open shell inside notification-service container"
	@echo "  $(CYAN)make shell-db$(RESET)       Open psql inside main-db"
	@echo "  $(CYAN)make shell-notif-db$(RESET) Open psql inside notification-db"
	@echo ""
	@echo "  $(CYAN)make restart-gateway$(RESET)  Restart gateway without touching other services"
	@echo "  $(CYAN)make rebuild-app$(RESET)      Rebuild + restart main-app only"
	@echo "  $(CYAN)make rebuild-notif$(RESET)    Rebuild + restart notification-service only"
	@echo ""

# ── Dev ──────────────────────────────────────────────────────────────────────

.PHONY: dev
dev:
	$(COMPOSE) up

.PHONY: dev-build
dev-build:
	$(COMPOSE) up --build

# ── Prod ─────────────────────────────────────────────────────────────────────

.PHONY: prod
prod:
	$(COMPOSE_PROD) up -d

.PHONY: prod-build
prod-build:
	$(COMPOSE_PROD) up --build -d

# ── Emergency rescue ─────────────────────────────────────────────────────────
# Run when a crash leaves debugger ports 9229/9230 allocated on the host.
# Kills whatever owns those ports, then removes stopped containers still
# holding the port binding.

.PHONY: kill-ports
kill-ports:
	@echo "$(CYAN)Releasing ports 9229 and 9230...$(RESET)"
	@lsof -ti :9229 | xargs -r kill -9 2>/dev/null || true
	@lsof -ti :9230 | xargs -r kill -9 2>/dev/null || true
	@docker ps -aq --filter status=exited | xargs -r docker rm -f 2>/dev/null || true
	@echo "$(CYAN)Done. Run 'make dev-build' now.$(RESET)"

# ── Stop / Teardown ──────────────────────────────────────────────────────────

.PHONY: stop
stop:
	$(COMPOSE) stop

.PHONY: down
down:
	$(COMPOSE) down

.PHONY: clean
clean:
	@echo "$(CYAN)Removing containers, networks, and named volumes...$(RESET)"
	$(COMPOSE) down -v

.PHONY: prune
prune: clean
	@echo "$(CYAN)Removing dangling images...$(RESET)"
	docker image prune -f

# ── Logs ─────────────────────────────────────────────────────────────────────

.PHONY: logs
logs:
	$(COMPOSE) logs -f

.PHONY: logs-gateway
logs-gateway:
	$(COMPOSE) logs -f api-gateway

.PHONY: logs-app
logs-app:
	$(COMPOSE) logs -f app-dev

.PHONY: logs-notif
logs-notif:
	$(COMPOSE) logs -f notification-service-dev

# ── Status ───────────────────────────────────────────────────────────────────

.PHONY: ps
ps:
	$(COMPOSE) ps

# ── Shells ───────────────────────────────────────────────────────────────────

.PHONY: shell-app
shell-app:
	$(COMPOSE) exec app-dev sh

.PHONY: shell-notif
shell-notif:
	$(COMPOSE) exec notification-service-dev sh

.PHONY: shell-db
shell-db:
	$(COMPOSE) exec main-db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

.PHONY: shell-notif-db
shell-notif-db:
	$(COMPOSE) exec notification-db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

# ── Surgical restarts ────────────────────────────────────────────────────────

.PHONY: restart-gateway
restart-gateway:
	$(COMPOSE) restart api-gateway

.PHONY: rebuild-app
rebuild-app:
	$(COMPOSE) up --build --no-deps -d app-dev

.PHONY: rebuild-notif
rebuild-notif:
	$(COMPOSE) up --build --no-deps -d notification-service-dev