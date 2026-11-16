import os
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'development-only-change-before-publishing')
DEBUG = os.getenv('DJANGO_DEBUG', 'true').lower() == 'true'
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver').split(',')
INSTALLED_APPS = ['daphne', 'django.contrib.contenttypes', 'channels', 'world.apps.WorldConfig']
MIDDLEWARE = ['django.middleware.security.SecurityMiddleware', 'world.middleware.SecurityHeadersMiddleware']
ROOT_URLCONF = 'config.urls'
ASGI_APPLICATION = 'config.asgi.application'
WSGI_APPLICATION = 'config.wsgi.application'
DATABASE_URL = os.getenv('DATABASE_URL', f'sqlite:///{ROOT_DIR / "data" / "passport.db"}')
DATABASES = {'default': dj_database_url.parse(DATABASE_URL, conn_max_age=0)}
if DATABASES['default']['ENGINE'] == 'django.db.backends.sqlite3':
    if DATABASES['default']['NAME'] != ':memory:':
        Path(DATABASES['default']['NAME']).parent.mkdir(parents=True, exist_ok=True)
    DATABASES['default']['OPTIONS'] = {'timeout': 20, 'transaction_mode': 'IMMEDIATE'}
    DATABASES['default']['TEST'] = {'NAME': str(ROOT_DIR / 'data' / 'test-passport.db')}
elif DATABASES['default']['ENGINE'] == 'django.db.backends.mysql':
    import pymysql
    pymysql.install_as_MySQLdb()
    DATABASES['default']['OPTIONS'] = {'charset': 'utf8mb4', 'init_command': "SET sql_mode='STRICT_TRANS_TABLES'"}
REDIS_URL = os.getenv('REDIS_URL')
CHANNEL_LAYERS = {'default': ({'BACKEND': 'channels_redis.core.RedisChannelLayer', 'CONFIG': {'hosts': [REDIS_URL]}} if REDIS_URL else {'BACKEND': 'channels.layers.InMemoryChannelLayer'})}
ALLOWED_ORIGINS = [origin.strip().rstrip('/') for origin in os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000').split(',') if origin.strip()]
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
USE_TZ = True
TIME_ZONE = 'UTC'
DATA_UPLOAD_MAX_MEMORY_SIZE = 65536
SECURE_CONTENT_TYPE_NOSNIFF = True
# The bundled React production build is served by Django for a single-origin preview.
FRONTEND_DIST = ROOT_DIR / 'dist'
