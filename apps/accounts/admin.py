from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Настройка отображения кастомного пользователя в админке Django"""
    
    # Колонки в общем списке пользователей
    list_display = (
        'username',
        'email',
        'first_name',
        'last_name',
        'phone',
        'is_staff',
        'is_active',
    )
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'groups')
    search_fields = ('username', 'first_name', 'last_name', 'email', 'phone')
    ordering = ('username',)

    # Добавляем кастомные поля phone и avatar в форму редактирования
    fieldsets = UserAdmin.fieldsets + (
        ('Дополнительная информация', {
            'fields': ('phone', 'avatar'),
        }),
    )

    # Добавляем кастомные поля в форму создания пользователя
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Дополнительная информация', {
            'fields': ('phone', 'avatar'),
        }),
    )