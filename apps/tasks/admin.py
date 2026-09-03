from django.contrib import admin
from .models import Task, Comment, Attachment, Tag, TaskRaciMatrix


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'type',
        'priority',
        'status',
        'project',
        'due_date',
        'created_at'
    ]
    list_filter = [
        'type',
        'priority',
        'status',
        'project',
        'created_at'
    ]
    search_fields = [
        'title',
        'description'
    ]
    filter_horizontal = [
        'assignees',
        'observers',
        'tags'
    ]
    readonly_fields = [
        'created_at',
        'updated_at'
    ]
    fieldsets = (
        ('Основная информация', {
            'fields': (
                'title',
                'description',
                'project',
                'type',
                'priority',
                'status'
            )
        }),
        ('Оценка и сроки', {
            'fields': (
                'story_points',
                'due_date'
            )
        }),
        ('Участники и теги', {
            'fields': (
                'assignees',
                'observers',
                'tags'
            )
        }),
        ('Иерархия', {
            'fields': (
                'parent_task',
                'order'
            )
        }),
        ('Системные поля', {
            'fields': (
                'created_at',
                'updated_at'
            )
        }),
    )


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = [
        'task',
        'author',
        'created_at'
    ]
    list_filter = [
        'author',
        'created_at'
    ]
    search_fields = [
        'text'
    ]


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = [
        'filename',
        'task',
        'uploaded_by',
        'uploaded_at'
    ]
    list_filter = [
        'uploaded_at'
    ]
    search_fields = [
        'filename'
    ]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'color'
    ]
    search_fields = [
        'name'
    ]

@admin.register(TaskRaciMatrix)
class TaskRaciMatrixAdmin(admin.ModelAdmin):
    list_display = ['task', 'user', 'role', 'notes']
    list_filter = ['role', 'task__project']
    search_fields = ['task__title', 'user__username', 'notes']