# facials/backend/api/routing.py
from django.urls import re_path
from .consumers import AttendanceConsumer # We will create this file next

websocket_urlpatterns = [
    re_path(r'ws/attendance/(?P<course_id>\d+)/$', AttendanceConsumer.as_asgi()),
]