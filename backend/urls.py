# facials/backend/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def root_view(request):
    return JsonResponse({"message": "SmartAttend API ✅ Running"})

urlpatterns = [
    path('', root_view),
    path('admin/', admin.site.urls),
    
    # Djoser URLs for authentication (login, register, etc.)
    path('api/auth/', include('djoser.urls')),
    path('api/auth/', include('djoser.urls.jwt')),
    
    # Your API URLs with the correct path
    path('api/', include('backend.api.urls')),
    
]

# This part is crucial for serving uploaded student photos during development

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)