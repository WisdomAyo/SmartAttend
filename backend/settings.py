# backend/settings.py - Production-Ready Settings
import os
from pathlib import Path
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# --------------------------------------
# Environment Configuration
# --------------------------------------
def get_env_variable(var_name, default=None, cast=str):
    """Get environment variable with optional casting and default value."""
    try:
        value = os.environ.get(var_name, default)
        if cast == bool:
            return value.lower() in ('true', '1', 'yes', 'on') if isinstance(value, str) else bool(value)
        elif cast == int:
            return int(value) if value is not None else None
        elif cast == list:
            return value.split(',') if value else []
        return cast(value) if value is not None else None
    except (ValueError, TypeError):
        if default is not None:
            return default
        raise ValueError(f"Environment variable {var_name} is required")

# --------------------------------------
# Security & Environment
# --------------------------------------
SECRET_KEY = get_env_variable('SECRET_KEY', 'django-insecure-6p*ung66z0y3d@8q8)9d3!j7#szllxne134ngfy4-aqb=0@9uh')
DEBUG = get_env_variable('DEBUG', True, cast=bool)

# Production-ready ALLOWED_HOSTS
ALLOWED_HOSTS = get_env_variable('ALLOWED_HOSTS', 'localhost,127.0.0.1', cast=list)

# Add render.com hosts if deploying to Render
if not DEBUG:
    RENDER_EXTERNAL_HOSTNAME = get_env_variable('RENDER_EXTERNAL_HOSTNAME')
    if RENDER_EXTERNAL_HOSTNAME:
        ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

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
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Added for static files in production
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
# Use environment variables for database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': get_env_variable('DATABASE_NAME', 'FaceRec'),
        'USER': get_env_variable('DATABASE_USER', 'postgres'),
        'PASSWORD': get_env_variable('DATABASE_PASSWORD', 'wisdom'),
        'HOST': get_env_variable('DATABASE_HOST', 'localhost'),
        'PORT': get_env_variable('DATABASE_PORT', '5432'),
    }
}

# Alternative: Support DATABASE_URL (common in cloud deployments)
DATABASE_URL = get_env_variable('DATABASE_URL')
if DATABASE_URL:
    import dj_database_url
    DATABASES['default'] = dj_database_url.parse(DATABASE_URL)

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
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ] if not DEBUG else [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    # 'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'DEFAULT_PAGINATION_CLASS': None,
    'PAGE_SIZE': 20,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=get_env_variable('JWT_ACCESS_TOKEN_LIFETIME', 60, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=get_env_variable('JWT_REFRESH_TOKEN_LIFETIME', 7, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# --------------------------------------
# Djoser Configuration
# --------------------------------------
FRONTEND_DOMAIN = get_env_variable('FRONTEND_DOMAIN', 'http://localhost:3000')

DJOSER = {
    'LOGIN_FIELD': 'email',
    'USER_CREATE_PASSWORD_RETYPE': True,
    'PASSWORD_RESET_CONFIRM_URL': 'password/reset/confirm/{uid}/{token}',
    'ACTIVATION_URL': 'activate/{uid}/{token}',
    'SEND_ACTIVATION_EMAIL': False,
    'USER_ACTIVATION': False,
    'DOMAIN': FRONTEND_DOMAIN,
    'SITE_NAME': get_env_variable('SITE_NAME', 'SmartAttend'),
    'SERIALIZERS': {
        "user": "backend.api.serializers.UserSerializer",
        'user_create': 'backend.api.serializers.UserCreateSerializer',
        'current_user': 'backend.api.serializers.UserSerializer',
        'token_create': 'djoser.serializers.TokenCreateSerializer',
    },
    'PASSWORD_RESET_SHOW_EMAIL_NOT_FOUND': False,
}

# --------------------------------------
# Email Configuration
# --------------------------------------
if DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = get_env_variable('EMAIL_HOST', 'sandbox.smtp.mailtrap.io')
    EMAIL_PORT = get_env_variable('EMAIL_PORT', 2525, cast=int)
    EMAIL_USE_TLS = get_env_variable('EMAIL_USE_TLS', True, cast=bool)
    EMAIL_HOST_USER = get_env_variable('420f6eaf3208ff')
    EMAIL_HOST_PASSWORD = get_env_variable('43413d6c080bd2')
    DEFAULT_FROM_EMAIL = get_env_variable('DEFAULT_FROM_EMAIL', 'noreply@smartattend.com')

# --------------------------------------
# CORS Configuration
# --------------------------------------
CORS_ALLOWED_ORIGINS = get_env_variable('CORS_ALLOWED_ORIGINS', 
    'http://localhost:3000,http://127.0.0.1:3000', cast=list)

# More permissive CORS for development
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOW_CREDENTIALS = True
else:
    CORS_ALLOW_CREDENTIALS = True
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r"^https://.*\.vercel\.app$",
        r"^https://.*\.netlify\.app$",
        r"^https://.*\.render\.com$",
    ]

# --------------------------------------
# Static & Media Files
# --------------------------------------
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Additional static files directories
STATICFILES_DIRS = []

# Static files storage for production
if not DEBUG:
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files configuration
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Ensure media directory exists
os.makedirs(MEDIA_ROOT, exist_ok=True)

# --------------------------------------
# Channels (WebSockets) Configuration
# --------------------------------------
REDIS_URL = get_env_variable('REDIS_URL', 'redis://127.0.0.1:6379')

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL],
        },
    },
}

# --------------------------------------
# Security Settings (Production)
# --------------------------------------
if not DEBUG:
    # Security middleware settings
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    
    # HTTPS settings (uncomment when using HTTPS in production)
    # SECURE_SSL_REDIRECT = True
    # SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    # SESSION_COOKIE_SECURE = True
    # CSRF_COOKIE_SECURE = True
    # SECURE_HSTS_SECONDS = 31536000
    # SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    # SECURE_HSTS_PRELOAD = True

# --------------------------------------
# Logging Configuration
# --------------------------------------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose' if DEBUG else 'simple',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'face_recognition.log'),
            'formatter': 'verbose',
        } if not DEBUG else {
            'class': 'logging.NullHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'backend.api.consumers': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'backend.api': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}

# Create logs directory
os.makedirs(os.path.join(BASE_DIR, 'logs'), exist_ok=True)

# --------------------------------------
# Face Recognition Settings
# --------------------------------------
# Optimize for production deployment
FACE_RECOGNITION_MODEL = get_env_variable('FACE_RECOGNITION_MODEL', 'ArcFace')
FACE_RECOGNITION_THRESHOLD = float(get_env_variable('FACE_RECOGNITION_THRESHOLD', '0.68'))
FACE_RECOGNITION_BACKEND = get_env_variable('FACE_RECOGNITION_BACKEND', 'opencv')

# Memory optimization for face recognition
if not DEBUG:
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  
    os.environ['CUDA_VISIBLE_DEVICES'] = '-1' 

# --------------------------------------
# Cache Configuration
# --------------------------------------
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'smartattend',
        'TIMEOUT': 300,
    }
} if REDIS_URL and not DEBUG else {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# --------------------------------------
# File Upload Settings
# --------------------------------------
# Limit file upload sizes
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000

# Allowed file extensions for student photos
ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png']
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB

# --------------------------------------
# Miscellaneous
# --------------------------------------
SITE_ID = 1
LANGUAGE_CODE = 'en-us'
TIME_ZONE = get_env_variable('TIME_ZONE', 'UTC')
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --------------------------------------
# Password Validators
# --------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# --------------------------------------
# Development vs Production Settings
# --------------------------------------
if DEBUG:
    # Development-specific settings
    INTERNAL_IPS = ['127.0.0.1', 'localhost']
    
    # Allow all hosts in development
    if not ALLOWED_HOSTS or ALLOWED_HOSTS == ['localhost', '127.0.0.1']:
        ALLOWED_HOSTS = ['*']
        
else:
    # Production-specific settings
    # Ensure SECRET_KEY is not the default in production
    if SECRET_KEY == 'django-insecure-6p*ung66z0y3d@8q8)9d3!j7#szllxne134ngfy4-aqb=0@9uh':
        raise ValueError("You must set a custom SECRET_KEY for production!")
    
    # Production optimizations
    SESSION_COOKIE_AGE = 86400  # 24 hours
    SESSION_SAVE_EVERY_REQUEST = False
    SESSION_EXPIRE_AT_BROWSER_CLOSE = True