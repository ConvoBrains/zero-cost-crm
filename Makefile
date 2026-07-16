# Convobrains CRM — common commands
# Usage: make <target>

.PHONY: help install dev build start lint smoke \
        db-migrate db-seed db-roles db-clean db-check \
        docker-build docker-up docker-down docker-restart docker-logs docker-ps docker-shell \
        deploy-ec2 deploy-nginx nginx-test health \
        test-up test-down test-migrate test-seed test-seed-activity test-reset test-run

COMPOSE := docker compose
TEST_COMPOSE := docker compose -f testing/docker-compose.yml
APP_URL := http://localhost:4000

help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ─── Local development ───────────────────────────────────────────────────────

install: ## Install npm dependencies
	npm install

dev: ## Run Vite + API (port 4000)
	npm run dev

build: ## Build frontend for production
	npm run build

start: ## Run production server locally (requires build + .env)
	npm run start

lint: ## Run oxlint
	npm run lint

smoke: ## Run API smoke test
	npm run smoke

health: ## Check local /api/health
	@curl -sf $(APP_URL)/api/health && echo

# ─── Database (uses .env / .env.local) ───────────────────────────────────────

db-migrate: ## Apply sql/schema.sql
	npm run db:migrate

db-seed: ## Migrate + seed users
	npm run db:seed

db-roles: ## Set monojoy→sdr, others→admin
	npm run db:roles

db-clean: ## Wipe data (destructive)
	npm run db:clean

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

deploy-ec2: install build docker-build docker-up ## Full EC2 deploy pipeline

# ─── Nginx (host install) ────────────────────────────────────────────────────

deploy-nginx: ## Copy nginx site config (requires sudo)
	sudo cp deploy/nginx/crm.convobrains.com.conf /etc/nginx/sites-available/crm.convobrains.com
	sudo ln -sf /etc/nginx/sites-available/crm.convobrains.com /etc/nginx/sites-enabled/crm.convobrains.com
	@echo "Run: sudo certbot --nginx -d crm.convobrains.com"
	@echo "Then: make nginx-test && sudo systemctl reload nginx"

nginx-test: ## Validate nginx config
	sudo nginx -t

# ─── Feature testing (testing/ only — never uses root .env / RDS) ─────────────

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
	node testing/migrate.mjs

test-seed: ## Seed test users + CRM fixtures
	node testing/seed-users.mjs
	node testing/seed-crm.mjs

test-seed-activity: ## Regenerate multi-SDR activity fixtures
	node testing/seed-activity.mjs

test-reset: ## Wipe test DB volume + migrate + seed + activity
	-$(TEST_COMPOSE) down -v
	$(MAKE) test-up
	$(MAKE) test-migrate
	$(MAKE) test-seed
	$(MAKE) test-seed-activity

test-run: ## Run app against testing/.env.testing (feature testing)
	@test -f testing/.env.testing || (echo "Copy testing/.env.testing.example → testing/.env.testing" && exit 1)
	set -a && . ./testing/.env.testing && set +a && npm run dev
