from .base import *

# Debug mode
DEBUG = True

# Use SQLite for testing without Docker
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'test_db.sqlite3',
    }
}

# Email backend
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Cache Configuration - Use local memory cache instead of Redis for testing
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'scholarmind-cache',
        'TIMEOUT': 300,
        'KEY_PREFIX': 'scholarmind',
    },
    'sessions': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'scholarmind-sessions',
        'KEY_PREFIX': 'session',
    }
}

# CORS settings for development
CORS_ALLOW_ALL_ORIGINS = True