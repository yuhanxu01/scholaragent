from .base import *

# Debug mode
DEBUG = True

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME', default='scholarmind_dev'),
        'USER': env('DB_USER', default='postgres'),
        'PASSWORD': env('DB_PASSWORD', default='postgres'),
        'HOST': env('DB_HOST', default='localhost'),
        'PORT': env('DB_PORT', default='5432'),
    }
}

# Email backend
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# CORS
CORS_ALLOW_ALL_ORIGINS = True

# Logging
LOGGING['handlers']['file']['filename'] = BASE_DIR / 'logs' / 'django_dev.log'

# Dictionary settings
MDX_DICTIONARY_PATH = BASE_DIR.parent / '简明英汉字典增强版.mdx'