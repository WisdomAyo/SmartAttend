# admin.py
from django.contrib import admin
from django.utils.translation import gettext as _
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ['email']
    list_display = ['email', 'first_name', 'last_name', 'is_staff']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'profile_picture', 'bio')}),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        (_('Important dates'), {'fields': ('last_login',)}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password', 'password_confirmation'),
        }),
    )
    search_fields = ('email',)
    filter_horizontal = ('groups', 'user_permissions',)
    readonly_fields = ('last_login',)

    def get_fieldsets(self, request, obj=None):
        if not obj:
            return self.add_fieldsets
        return super().get_fieldsets(request, obj)
