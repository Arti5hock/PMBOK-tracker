from django.contrib import admin
from .models import Risk


@admin.register(Risk)
class RiskAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'project',
        'score',
        'severity',
        'strategy',
        'status',
        'owner',
        'created_at',
    ]
    list_filter = ['project', 'status', 'strategy']
    search_fields = ['title', 'description', 'response_plan']
    readonly_fields = ['score', 'created_at', 'updated_at']
    ordering = ['-score']