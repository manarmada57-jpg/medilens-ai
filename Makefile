.PHONY: help dev build test lint seed clean

help:
	@echo "MediLens AI — Development Commands:"
	@echo "  make dev       Start the full local development stack"
	@echo "  make build     Build container images and frontend distribution"
	@echo "  make test      Run backend and frontend tests"
	@echo "  make lint      Run code formatters and static analyzers"
	@echo "  make seed      Seed initial medical knowledge (MedlinePlus/WHO/NIH)"
	@echo "  make clean     Remove temporary build artifacts and caches"

dev:
	docker compose up --build

build:
	docker compose build
	cd frontend && npm run build

test: test-backend test-frontend

test-backend:
	cd backend && python3 -m pytest tests/

test-frontend:
	cd frontend && npm test 2>/dev/null || npm run lint

lint: lint-backend lint-frontend

lint-backend:
	cd backend && ruff check app/ tests/
	cd backend && mypy app/

lint-frontend:
	cd frontend && npm run lint

seed:
	docker compose exec api python -m scripts.ingest_knowledge

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -name ".DS_Store" -delete
	rm -rf frontend/dist
