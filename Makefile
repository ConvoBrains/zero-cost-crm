# Zero Cost CRM — common commands
# Usage: make <target>

.PHONY: help setup reset-demo install dev build start lint test test-api test-api-prep test-e2e \
        db-migrate db-check \
        docker-build docker-up docker-down docker-restart docker-logs docker-ps docker-shell \
        health \
        test-up test-down test-migrate test-seed test-seed-activity test-reset test-run

COMPOSE := docker compose
TEST_COMPOSE := docker compose -f testing/functional/docker-compose.yml
APP_URL := http://localhost:4000

help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ─── Local development ───────────────────────────────────────────────────────

setup: ## One-command local setup (Docker + demo data)
	@command -v docker >/dev/null || (echo "Docker is required: https://docs.docker.com/get-docker/" && exit 1)
	@command -v npm >/dev/null || (echo "Node.js 22+ is required: https://nodejs.org/" && exit 1)
	@test -f testing/functional/.env.testing || cp testing/functional/.env.testing.example testing/functional/.env.testing
	@if [ -f package-lock.json ]; then npm ci; else npm install; fi
	$(MAKE) test-reset
	@echo ""
	@echo "Zero Cost CRM is ready"
	@echo "  Run:      make dev"
	@echo "  Open:     http://localhost:5173"
	@echo "  Email:    founder.seed@convobrains.com"
	@echo "  Password: TestSeed123!"
	@echo "  Product:  https://www.convobrains.com"

reset-demo: test-reset ## Reset local demo data

install: ## Install npm dependencies
	npm install

dev: ## Run Vite + API (port 4000)
	@test -f testing/functional/.env.testing || (echo "Run make setup first" && exit 1)
	set -a && . ./testing/functional/.env.testing && set +a && npm run dev

build: ## Build frontend for production
	npm run build

start: ## Run production server locally (requires build + .env)
	npm run start

lint: ## Run oxlint
	npm run lint

test: ## Unit tests
	npm test

test-api: ## API functional tests (DB must be prepared)
	npm run test:api

test-api-prep: ## Migrate + seed functional DB
	npm run test:api:prep

test-e2e: ## UI e2e (Docker Postgres + seed + Playwright)
	$(MAKE) test-up
	npm run test:api:prep
	npm run test:e2e

health: ## Check local /api/health
	@curl -sf $(APP_URL)/api/health && echo

# ─── Database (uses .env / .env.local) ───────────────────────────────────────

db-migrate: ## Apply sql/schema.sql
	npm run db:migrate

db-check: ## Verify DB connectivity
	node scripts/db-check.mjs

# ─── Docker ──────────────────────────────────────────────────────────────────

docker-build: ## Build Docker image on-host (no registry)
	$(COMPOSE) build

docker-up: ## Start CRM container (detached; never pull app image)
	$(COMPOSE) up -d --pull never

docker-down: ## Stop CRM container
	$(COMPOSE) down

docker-restart: ## Restart CRM container
	$(COMPOSE) restart

docker-logs: ## Tail container logs
	$(COMPOSE) logs -f crm

docker-ps: ## Show container status
	$(COMPOSE) ps

docker-shell: ## Shell into running container
	$(COMPOSE) exec crm sh

# ─── Functional testing (testing/functional — never uses root .env / RDS) ─────

test-up: ## Start Docker Postgres for feature tests (port 5434)
	$(TEST_COMPOSE) up -d
	@echo "Waiting for crm-test-db…"
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12; do \
	  $(TEST_COMPOSE) exec -T crm-test-db pg_isready -U crm_test -d brains_crm_test >/dev/null 2>&1 && break; \
	  sleep 1; \
	done

test-down: ## Stop feature-test Postgres
	$(TEST_COMPOSE) down

test-migrate: ## Apply schema to test DB only
	$(TEST_COMPOSE) exec -T crm-test-db psql -v ON_ERROR_STOP=1 -U crm_test -d brains_crm_test < sql/schema.sql

test-seed: ## Seed test users + CRM fixtures
	node testing/functional/seed-users.mjs
	node testing/functional/seed-crm.mjs

test-seed-activity: ## Regenerate multi-SDR activity fixtures
	node testing/functional/seed-activity.mjs

test-reset: ## Wipe test DB volume + migrate + seed + activity
	-$(TEST_COMPOSE) down -v
	$(MAKE) test-up
	$(MAKE) test-migrate
	$(MAKE) test-seed
	$(MAKE) test-seed-activity

test-run: ## Run app against testing/functional/.env.testing
	@test -f testing/functional/.env.testing || (echo "Copy testing/functional/.env.testing.example → testing/functional/.env.testing" && exit 1)
	set -a && . ./testing/functional/.env.testing && set +a && npm run dev
