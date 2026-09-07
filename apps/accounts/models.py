from django.db import models
from django.contrib.auth.models import AbstractUser
import json

class User(AbstractUser):
    phone = models.CharField(max_length=20, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    module_settings = models.JSONField(
        default=dict,
        blank=True,
        help_text="Настройки видимости модулей: {'kanban': true, 'raci': true, 'milestones': true, 'risks': true}"
    )
    
    def __str__(self):
        return self.username
    
    def get_module_settings(self):
        """Возвращает настройки модулей с дефолтными значениями"""
        defaults = {
            'kanban': True,
            'raci': True,
            'milestones': True,
            'risks': True,
        }
        if self.module_settings:
            defaults.update(self.module_settings)
        return defaults
    
    def update_module_settings(self, settings):
        """Обновляет настройки модулей"""
        valid_keys = {'kanban', 'raci', 'milestones', 'risks'}
        current = self.get_module_settings()
        for key, value in settings.items():
            if key in valid_keys and isinstance(value, bool):
                current[key] = value
        self.module_settings = current
        self.save(update_fields=['module_settings'])
        return current