.PHONY: help install backend frontend build dev test check

help:
	@echo "Harness² 单仓构建与运维命令 (frontend/ + backend/)"
	@echo "  make install   - 安装后端 Python 依赖包与前端 Node 依赖"
	@echo "  make build     - 编译前端单页应用产物至 frontend/dist/"
	@echo "  make backend   - 启动 FastAPI 后端与可视化 Web 控制台服务 (端口 8520)"
	@echo "  make frontend  - 启动 Vite 前端热更新开发服务器 (端口 5173 -> 代理 8520)"
	@echo "  make dev       - 编译前端并启动全栈可视化 Web 控制台"
	@echo "  make test      - 运行后端单元测试、代码规范检查与文档完整性校验"

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
	.venv/bin/python3 -m pytest backend/tests
	.venv/bin/ruff check --config backend/pyproject.toml backend/
	.venv/bin/python3 scripts/check_provenance.py
	.venv/bin/python3 scripts/check_docs_sync.py
