from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers
from .models import Attachment, Comment, Milestone, Tag, Task, TaskRaciMatrix

User = get_user_model()


class TagSerializer(serializers.ModelSerializer):
    """Сериализатор для тегов"""

    class Meta:
        model = Tag
        fields = ['id', 'name', 'color', 'created_at']


class TaskRaciMatrixSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = TaskRaciMatrix
        fields = ['id', 'task', 'user', 'username', 'role', 'role_display', 'notes']
        read_only_fields = ['id', 'role_display']

    def validate(self, attrs):
        task = attrs.get('task')
        role = attrs.get('role')
        # Проверка правила единственности Accountable
        if role == TaskRaciMatrix.Role.ACCOUNTABLE:
            qs = TaskRaciMatrix.objects.filter(task=task, role=role)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    'role': 'У этой задачи уже назначен утвердитель (Accountable).'
                })
        return attrs


class MilestoneSerializer(serializers.ModelSerializer):
    tasks_count = serializers.IntegerField(source='tasks.count', read_only=True)
    completed_tasks_count = serializers.SerializerMethodField()

    class Meta:
        model = Milestone
        fields = [
            'id',
            'project',
            'title',
            'description',
            'due_date',
            'status',
            'tasks_count',
            'completed_tasks_count',
        ]
        read_only_fields = ['id', 'tasks_count', 'completed_tasks_count']

    def get_completed_tasks_count(self, obj):
        return obj.tasks.filter(status=Task.Status.DONE).count()


class TaskSerializer(serializers.ModelSerializer):
    """Сериализатор для задач с поддержкой WBS и декомпозиции"""

    assignee_names = serializers.SerializerMethodField()
    observer_names = serializers.SerializerMethodField()
    parent_task_title = serializers.ReadOnlyField(source='parent_task.title')
    milestone_title = serializers.ReadOnlyField(source='milestone.title')
    wbs_code = serializers.ReadOnlyField()
    raci_assignments = TaskRaciMatrixSerializer(many=True, read_only=True)
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    attachments_count = serializers.IntegerField(source='attachments.count', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id',
            'project',
            'parent_task',
            'parent_task_title',
            'milestone',
            'milestone_title',
            'wbs_code',
            'title',
            'description',
            'type',
            'priority',
            'status',
            'assignees',
            'assignee_names',
            'observers',
            'observer_names',
            'tags',
            'due_date',
            'order',
            'created_at',
            'updated_at',
            'raci_assignments',
            'comments_count',
            'attachments_count',
        ]
        read_only_fields = ['id', 'wbs_code', 'created_at', 'updated_at']

    def get_assignee_names(self, obj):
        return [u.username for u in obj.assignees.all()]

    def get_observer_names(self, obj):
        return [u.username for u in obj.observers.all()]


class CommentSerializer(serializers.ModelSerializer):
    """Сериализатор для комментариев"""

    author_name = serializers.ReadOnlyField(source='author.username')

    class Meta:
        model = Comment
        fields = [
            'id',
            'task',
            'text',
            'author',
            'author_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'task', 'author', 'author_name', 'created_at', 'updated_at']


class AttachmentSerializer(serializers.ModelSerializer):
    """Сериализатор для вложений"""

    uploaded_by_name = serializers.ReadOnlyField(source='uploaded_by.username')
    file_size = serializers.SerializerMethodField()
    file_extension = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            'id',
            'task',
            'file',
            'filename',
            'uploaded_by',
            'uploaded_by_name',
            'uploaded_at',
            'file_size',
            'file_extension',
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at', 'file_size', 'file_extension']

    def get_file_size(self, obj):
        if obj.file and hasattr(obj.file, "size"):
            return obj.file.size
        return None

    def get_file_extension(self, obj):
        if obj.file and obj.file.name:
            return obj.file.name.split(".")[-1].lower()
        return None
