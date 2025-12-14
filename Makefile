.PHONY: help build up down shell clean migrate superuser logs lint test

# Default target
help:
	@echo "ScholarMind - Development Commands"
	@echo ""
	@echo "build          Build all Docker images"
	@echo "up             Start all services"
	@echo "up-dev         Start services in development mode"
	@echo "down           Stop all services"
	@echo "shell          Open Django shell"
	@echo "logs           Show logs"
	@echo "clean          Clean up Docker resources"
	@echo "migrate        Run Django migrations"
	@echo "superuser      Create Django superuser"
	@echo "lint           Run linting"
	@echo "test           Run tests"

# Build Docker images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d
	@echo "Services started:"
	@echo "- Frontend: http://localhost:3000"
	@echo "- Backend API: http://localhost:8000"
	@echo "- Admin: http://localhost:8000/admin"
	@echo "- Flower: http://localhost:5555"

# Start in development mode
up-dev:
	cp .env.example .env
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
	@echo "Development services started:"
	@echo "- Frontend: http://localhost:3000"
	@echo "- Backend API: http://localhost:8000"

# Stop all services
down:
	docker-compose down

# Open Django shell
shell:
	docker-compose exec backend python manage.py shell

# Show logs
logs:
	docker-compose logs -f

# Clean up Docker resources
clean:
	docker-compose down -v
	docker system prune -f
	docker volume prune -f

# Run Django migrations
migrate:
	docker-compose exec backend python manage.py migrate

# Create Django superuser
superuser:
	docker-compose exec backend python manage.py createsuperuser

# Run linting (Python)
lint:
	docker-compose exec backend flake8 .
	docker-compose exec backend black --check .
	docker-compose exec backend isort --check-only .

# Run tests
test:
	docker-compose exec backend python manage.py test

# Install dependencies (if not using Docker)
install-backend:
	cd backend && pip install -r requirements/development.txt

install-frontend:
	cd frontend && npm install

# Database reset
reset-db:
	docker-compose down -v
	docker-compose up -d db redis
	sleep 5
	docker-compose exec backend python manage.py migrate
	docker-compose exec backend python manage.py createsuperuser

# Development server without Docker
dev-backend:
	cd backend && python manage.py runserver

dev-frontend:
	cd frontend && npm run dev