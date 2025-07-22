# backend/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, StudentViewSet, DashboardDataView, UserViewSet



# SESSION: API ROUTING
# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'students', StudentViewSet, basename='student')
router.register(r'users', UserViewSet, basename='user')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
    path('dashboard-data/', DashboardDataView.as_view(), name='dashboard-data'),
  

]