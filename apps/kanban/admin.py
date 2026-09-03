from django.contrib import admin
from .models import KanbanColumn, KanbanBoard, KanbanActivity


@admin.register(KanbanColumn)
class KanbanColumnAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'project',
        'type',
        'wip_limit',
        'order',
        'is_active'
    ]
    list_filter = [
        'project',
        'type',
        'is_active'
    ]
    search_fields = [
        'name'
    ]
    ordering = ['project', 'order']


@admin.register(KanbanBoard)
class KanbanBoardAdmin(admin.ModelAdmin):
    list_display = [
        'project',
        'is_archived',
        'created_at'
    ]
    list_filter = [
        'is_archived',
        'created_at'
    ]
    filter_horizontal = ['columns']
    search_fields = [
        'project__name'
    ]


@admin.register(KanbanActivity)
class KanbanActivityAdmin(admin.ModelAdmin):
    list_display = [
        'task',
        'action',
        'user',
        'timestamp'
    ]
    list_filter = [
        'action',
        'user',
        'timestamp'
    ]
    search_fields = [
        'task__title'
    ]
    readonly_fields = ['timestamp']
    ordering = ['-timestamp']