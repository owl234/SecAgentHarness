.PHONY: help install backend frontend build dev test check

help:
	@echo "Harness² Monorepo Commands (frontend/ + backend/)"
	@echo "  make install   - Install backend Python package and frontend Node dependencies"
	@echo "  make build     - Build frontend SPA into frontend/dist/"
	@echo "  make backend   - Start FastAPI backend & Web Console server (port 8520)"
	@echo "  make frontend  - Start Vite frontend dev server with HMR (port 5173 -> proxy 8520)"
	@echo "  make dev       - Build frontend and launch full-stack Web Console"
	@echo "  make test      - Run backend unit tests and docs sync check"

install:
	uv pip install -e './backend[ui,render]'
	cd frontend && npm install

build:
	cd frontend && npm run build

backend:
	.venv/bin/sec-agent-harness2-ui

frontend:
	cd frontend && npm run dev

dev: build backend

test:
	.venv/bin/pytest backend/tests
	.venv/bin/ruff check --config backend/pyproject.toml backend/
	.venv/bin/python3 scripts/check_provenance.py
	.venv/bin/python3 scripts/check_docs_sync.py
