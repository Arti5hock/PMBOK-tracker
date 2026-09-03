from rest_framework import serializers
from .models import KanbanColumn, KanbanBoard, KanbanActivity
from apps.tasks.serializers import TaskSerializer


class KanbanColumnSerializer(serializers.ModelSerializer):
    """Сериализатор для колонки Канбан"""
    task_count = serializers.SerializerMethodField()
    task_count_by_priority = serializers.SerializerMethodField()
    tasks = serializers.SerializerMethodField()
    
    class Meta:
        model = KanbanColumn
        fields = [
            'id', 'project', 'type', 'name', 'wip_limit', 'order',
            'is_active', 'created_at', 'updated_at',
            'task_count', 'task_count_by_priority', 'tasks'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_task_count(self, obj):
        from apps.tasks.models import Task
        return Task.objects.filter(project=obj.project, status=obj.type).count()
    
    def get_task_count_by_priority(self, obj):
        from apps.tasks.models import Task
        counts = {}
        for priority in ['critical', 'high', 'medium', 'low']:
            counts[priority] = Task.objects.filter(
                project=obj.project,
                status=obj.type,
                priority=priority
            ).count()
        return counts
    
    def get_tasks(self, obj):
        from apps.tasks.models import Task
        tasks = Task.objects.filter(
            project=obj.project,
            status=obj.type
        ).order_by('order')
        return TaskSerializer(tasks, many=True).data


class KanbanBoardSerializer(serializers.ModelSerializer):
    """Сериализатор для Канбан-доски"""
    columns = KanbanColumnSerializer(many=True, read_only=True)
    total_tasks = serializers.SerializerMethodField()
    
    class Meta:
        model = KanbanBoard
        fields = [
            'id', 'project', 'columns', 'is_archived',
            'created_at', 'updated_at', 'total_tasks'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_total_tasks(self, obj):
        from apps.tasks.models import Task
        return Task.objects.filter(project=obj.project).count()


class KanbanActivitySerializer(serializers.ModelSerializer):
    """Сериализатор для активности Канбан"""
    task_title = serializers.ReadOnlyField(source='task.title')
    username = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = KanbanActivity
        fields = [
            'id', 'task', 'task_title', 'action', 'from_status',
            'to_status', 'user', 'username', 'timestamp', 'metadata'
        ]
        read_only_fields = ['id', 'timestamp']