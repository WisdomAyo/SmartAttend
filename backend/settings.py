import os
from pathlib import Path
from datetime import timedelta

# --------------------------------------
# Core Paths
# --------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# --------------------------------------
# Security & Environment
# --------------------------------------
SECRET_KEY = "django-insecure-6p*ung66z0y3d@8q8)9d3!j7#szllxne134ngfy4-aqb=0@9uh"
DEBUG = True
ALLOWED_HOSTS = []

# --------------------------------------
# Application Definition
# --------------------------------------
INSTALLED_APPS = [
    'channels',
    'django.contrib.sites',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'djoser',
    'backend.api',
    'django_extensions',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]
WSGI_APPLICATION = 'backend.wsgi.application'
ASGI_APPLICATION = 'backend.asgi.application'

# --------------------------------------
# Database Configuration
# --------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'FaceRec',
        'USER': 'postgres',
        'PASSWORD': 'wisdom',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# --------------------------------------
# Authentication & Permissions
# --------------------------------------
AUTH_USER_MODEL = 'api.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}

DJOSER = {
    'LOGIN_FIELD': 'email',
    'USER_CREATE_PASSWORD_RETYPE': True,
    'PASSWORD_RESET_CONFIRM_URL': 'password/reset/confirm/{uid}/{token}',
    'ACTIVATION_URL': 'activate/{uid}/{token}',
    'SEND_ACTIVATION_EMAIL': False,
    'USER_ACTIVATION': False,
    'DOMAIN': 'http://localhost:3000',
    'SITE_NAME': 'SmartAttend',
    'SERIALIZERS': {
         "user": "backend.api.serializers.UserSerializer",
        'user_create': 'backend.api.serializers.UserCreateSerializer',
        'current_user': 'backend.api.serializers.UserSerializer',
        'token_create': 'djoser.serializers.TokenCreateSerializer',
    },
    'PASSWORD_RESET_SHOW_EMAIL_NOT_FOUND': False,
}

# --------------------------------------
# Email Configuration (Dev)
# --------------------------------------
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = 'noreply@veeki.co'

# --------------------------------------
# CORS Configuration
# --------------------------------------
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://172.22.112.1:3000',
]

# --------------------------------------
# Static & Media Files
# --------------------------------------
STATIC_URL = '/static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# --------------------------------------
# Channels (WebSockets)
# --------------------------------------
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('127.0.0.1', 6379)],
        },
    },
}

# --------------------------------------
# Miscellaneous
# --------------------------------------
SITE_ID = 1
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --------------------------------------
# Password Validators
# --------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
