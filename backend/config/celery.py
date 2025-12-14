import os
from pathlib import Path
from celery import Celery

# 获取项目根目录
BASE_DIR = Path(__file__).resolve().parent.parent

# 加载环境变量
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, '.env'))
except ImportError:
    pass  # 如果没有安装 python-dotenv，则跳过

# 设置默认的 Django 设置模块
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

# 创建 Celery 应用
app = Celery('scholarmind')

# 使用 Django 设置来配置 Celery
app.config_from_object('django.conf:settings', namespace='CELERY')

# 自动发现任务
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')