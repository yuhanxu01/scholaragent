#!/bin/bash
# ScholarMind 部署自动化脚本
# 自动设置环境变量、数据库、Redis等

set -e

echo "🎓 ScholarMind 部署自动化脚本"
echo "================================"

# 检查是否以root运行
if [[ $EUID -eq 0 ]]; then
    echo "⚠️  不建议以root用户运行，请使用普通用户"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 函数：检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "命令 '$1' 未找到，请先安装"
        exit 1
    fi
}

# 检查必需的命令
print_info "检查必需的命令..."
check_command python3
check_command pip3
check_command docker
check_command docker-compose
check_command psql

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

print_info "项目根目录: $PROJECT_ROOT"

# 1. 生成安全的SECRET_KEY
print_info "生成安全的SECRET_KEY..."
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
print_info "生成的SECRET_KEY: ${SECRET_KEY:0:20}..."

# 2. 创建生产环境.env文件
print_info "创建生产环境.env文件..."
cat > "$BACKEND_DIR/.env.production" << EOF
# ========================================
# ScholarMind 生产环境配置
# 自动生成于 $(date)
# ========================================

# Django Settings
SECRET_KEY=$SECRET_KEY
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com

# Database (PostgreSQL)
DB_NAME=scholarmind_prod
DB_USER=scholarmind_user
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-24)
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/1
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# CORS
CORS_ALLOWED_ORIGINS=https://your-domain.com,http://localhost:3000

# DeepSeek API (请替换为实际值)
DEEPSEEK_API_KEY=your-actual-deepseek-api-key-here

# Email (SMTP配置)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Logging
LOG_LEVEL=INFO

# 文件上传限制 (MB)
FILE_UPLOAD_MAX_SIZE=50
DATA_UPLOAD_MAX_SIZE=50
EOF

print_info "生产环境配置文件已创建: $BACKEND_DIR/.env.production"

# 3. 创建数据库设置脚本
print_info "创建数据库初始化脚本..."
cat > "$PROJECT_ROOT/deploy/init_database.sql" << EOF
-- ScholarMind 数据库初始化脚本
-- 自动生成于 $(date)

-- 创建数据库
CREATE DATABASE scholarmind_prod;

-- 创建用户
CREATE USER scholarmind_user WITH PASSWORD '$(grep DB_PASSWORD "$BACKEND_DIR/.env.production" | cut -d= -f2)';

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE scholarmind_prod TO scholarmind_user;

-- 设置扩展 (如果需要)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建测试数据库
CREATE DATABASE scholarmind_test;
GRANT ALL PRIVILEGES ON DATABASE scholarmind_test TO scholarmind_user;

print_info "数据库初始化脚本已创建: $PROJECT_ROOT/deploy/init_database.sql"

# 4. 创建Docker Compose生产配置文件
print_info "创建Docker Compose生产配置..."
cat > "$PROJECT_ROOT/docker-compose.prod.yml" << EOF
version: '3.8'

services:
  # PostgreSQL数据库
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: scholarmind_prod
      POSTGRES_USER: scholarmind_user
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./deploy/init_database.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U scholarmind_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Django后端 (Gunicorn)
  backend:
    build:
      context: ./backend
      dockerfile: ../docker/Dockerfile.backend.prod
    command: >
      sh -c "python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4"
    volumes:
      - ./backend:/app
      - static_volume:/app/staticfiles
      - media_volume:/app/media
    ports:
      - "8000:8000"
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.production
      - DATABASE_URL=postgres://scholarmind_user:\${DB_PASSWORD}@db:5432/scholarmind_prod
      - REDIS_URL=redis://redis:6379/1
      - CELERY_BROKER_URL=redis://redis:6379/0
    env_file:
      - ./backend/.env.production
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  # Celery Worker
  celery:
    build:
      context: ./backend
      dockerfile: ../docker/Dockerfile.backend.prod
    command: celery -A config worker -l info --concurrency=4
    volumes:
      - ./backend:/app
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.production
      - DATABASE_URL=postgres://scholarmind_user:\${DB_PASSWORD}@db:5432/scholarmind_prod
      - REDIS_URL=redis://redis:6379/1
      - CELERY_BROKER_URL=redis://redis:6379/0
    env_file:
      - ./backend/.env.production
    depends_on:
      - backend
      - redis
    restart: unless-stopped

  # Celery Beat (定时任务)
  celery-beat:
    build:
      context: ./backend
      dockerfile: ../docker/Dockerfile.backend.prod
    command: celery -A config beat -l info
    volumes:
      - ./backend:/app
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.production
      - DATABASE_URL=postgres://scholarmind_user:\${DB_PASSWORD}@db:5432/scholarmind_prod
      - REDIS_URL=redis://redis:6379/1
      - CELERY_BROKER_URL=redis://redis:6379/0
    env_file:
      - ./backend/.env.production
    depends_on:
      - backend
      - redis
    restart: unless-stopped

  # Nginx反向代理
  nginx:
    image: nginx:alpine
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - static_volume:/static
      - media_volume:/media
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  static_volume:
  media_volume:
EOF

print_info "Docker Compose生产配置已创建: $PROJECT_ROOT/docker-compose.prod.yml"

# 5. 创建生产Dockerfile
print_info "创建生产Dockerfile..."
mkdir -p "$PROJECT_ROOT/docker"

cat > "$PROJECT_ROOT/docker/Dockerfile.backend.prod" << EOF
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖
COPY requirements/production.txt .
RUN pip install --no-cache-dir -r production.txt

# 复制项目文件
COPY . .

# 创建非root用户
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# 收集静态文件 (在构建时执行)
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
EOF

# 6. 创建Nginx配置
print_info "创建Nginx配置..."
mkdir -p "$PROJECT_ROOT/docker/nginx"

cat > "$PROJECT_ROOT/docker/nginx/nginx.conf" << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # 上游服务器
    upstream backend {
        server backend:8000;
    }

    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;
        return 301 https://\$server_name\$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        # SSL证书 (需要替换为实际路径)
        ssl_certificate /etc/ssl/certs/your-domain.crt;
        ssl_certificate_key /etc/ssl/private/your-domain.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # 静态文件
        location /static/ {
            alias /static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # 媒体文件
        location /media/ {
            alias /media/;
            expires 30d;
            add_header Cache-Control "public";
        }

        # API请求
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        # WebSocket支持
        location /ws/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        }

        # 健康检查
        location /health/ {
            proxy_pass http://backend;
            access_log off;
        }

        # 管理后台
        location /admin/ {
            proxy_pass http://backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF

# 7. 创建部署检查脚本
print_info "创建部署检查脚本..."
cat > "$PROJECT_ROOT/deploy/check_deployment.sh" << EOF
#!/bin/bash
# 部署检查脚本

set -e

echo "🔍 检查部署状态..."

# 检查Docker服务
echo "1. 检查Docker服务..."
docker-compose -f docker-compose.prod.yml ps

# 检查数据库连接
echo "2. 检查数据库连接..."
docker-compose -f docker-compose.prod.yml exec db pg_isready -U scholarmind_user

# 检查Redis连接
echo "3. 检查Redis连接..."
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# 检查Django健康端点
echo "4. 检查Django健康端点..."
curl -f http://localhost:8000/api/health/ || echo "健康检查失败"

# 检查静态文件
echo "5. 检查静态文件..."
docker-compose -f docker-compose.prod.yml exec backend ls -la /app/staticfiles/

echo "✅ 部署检查完成"
EOF

chmod +x "$PROJECT_ROOT/deploy/check_deployment.sh"

# 8. 创建一键部署脚本
print_info "创建一键部署脚本..."
cat > "$PROJECT_ROOT/deploy/deploy.sh" << EOF
#!/bin/bash
# ScholarMind 一键部署脚本

set -e

echo "🚀 开始部署 ScholarMind..."

# 1. 停止现有服务
echo "1. 停止现有服务..."
docker-compose -f docker-compose.prod.yml down || true

# 2. 构建镜像
echo "2. 构建镜像..."
docker-compose -f docker-compose.prod.yml build

# 3. 启动服务
echo "3. 启动服务..."
docker-compose -f docker-compose.prod.yml up -d

# 4. 等待服务就绪
echo "4. 等待服务就绪..."
sleep 10

# 5. 运行数据库迁移
echo "5. 运行数据库迁移..."
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# 6. 创建超级用户 (可选)
echo "6. 创建超级用户..."
read -p "是否创建超级用户? (y/N): " -n 1 -r
echo
if [[ \$REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
fi

# 7. 运行部署检查
echo "7. 运行部署检查..."
./deploy/check_deployment.sh

echo "🎉 部署完成!"
echo "🌐 访问地址: http://localhost:8000"
echo "🔧 管理后台: http://localhost:8000/admin/"
echo "📊 查看日志: docker-compose -f docker-compose.prod.yml logs -f"
EOF

chmod +x "$PROJECT_ROOT/deploy/deploy.sh"

# 9. 创建备份脚本
print_info "创建数据库备份脚本..."
cat > "$PROJECT_ROOT/deploy/backup.sh" << EOF
#!/bin/bash
# 数据库备份脚本

set -e

BACKUP_DIR="\$HOME/scholarmind_backups"
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="\$BACKUP_DIR/scholarmind_backup_\$TIMESTAMP.sql"

mkdir -p "\$BACKUP_DIR"

echo "📦 备份数据库到: \$BACKUP_FILE"

docker-compose -f docker-compose.prod.yml exec db pg_dump -U scholarmind_user scholarmind_prod > "\$BACKUP_FILE"

# 压缩备份
gzip "\$BACKUP_FILE"

echo "✅ 备份完成: \${BACKUP_FILE}.gz"

# 删除7天前的备份
find "\$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
EOF

chmod +x "$PROJECT_ROOT/deploy/backup.sh"

# 设置脚本权限
chmod +x "$PROJECT_ROOT/deploy/setup.sh"

print_info "🎉 部署自动化脚本创建完成!"
echo ""
echo "📋 下一步操作:"
echo "1. 编辑 $BACKEND_DIR/.env.production 文件，填写实际配置"
echo "2. 运行 ./deploy/deploy.sh 开始部署"
echo "3. 运行 ./deploy/check_deployment.sh 检查部署状态"
echo ""
echo "🔧 可用脚本:"
echo "  ./deploy/setup.sh      - 生成配置文件 (已运行)"
echo "  ./deploy/deploy.sh     - 一键部署"
echo "  ./deploy/check_deployment.sh - 检查部署"
echo "  ./deploy/backup.sh     - 数据库备份"
echo ""
echo "⚠️  注意:"
echo "  - 请确保已安装 Docker 和 Docker Compose"
echo "  - 生产环境请使用真实的 SSL 证书"
echo "  - 定期运行备份脚本"