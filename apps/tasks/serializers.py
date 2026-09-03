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

    def get_completed_tasks_count(self, obj):
        return obj.tasks.filter(status='done').count()

    def validate(self, data):
        new_status = data.get('status')
        if new_status == Milestone.Status.ACHIEVED and self.instance:
            if self.instance.tasks.exclude(status='done').exists():
                raise serializers.ValidationError(
                    {'status': 'Нельзя закрыть веху: не все связанные задачи завершены.'}
                )
        return data


class TaskSerializer(serializers.ModelSerializer):
    wbs_code = serializers.ReadOnlyField()
    
    # Алиас для фронтенда: React ждет 'parent', а не 'parent_task'
    parent = serializers.PrimaryKeyRelatedField(
        source='parent_task', 
        queryset=Task.objects.all(), 
        required=False, 
        allow_null=True
    )
    
    # Динамический расчет прогресса
    progress = serializers.SerializerMethodField()

    assignees = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.all(), required=False
    )
    assignees_detail = serializers.SerializerMethodField()
    raci = TaskRaciMatrixSerializer(source='raci_assignments', many=True, read_only=True)

    class Meta:
        model = Task
        fields = [
            'id',
            'wbs_code',
            'milestone',
            'title',
            'description',
            'type',
            'priority',
            'status',
            'progress',      
            'story_points',
            'due_date',
            'project',
            'assignees',
            'assignees_detail',
            'parent',        
            'parent_task',   
            'order',
            'created_at',
            'updated_at',
            'raci'
        ]
        read_only_fields = ['id', 'wbs_code', 'created_at', 'updated_at']

    def get_progress(self, obj):
        # Если у задачи есть подзадачи, её прогресс рассчитывается на их основе
        subtasks = obj.subtasks.all()
        if subtasks.exists():
            total = subtasks.count()
            done = subtasks.filter(status='done').count()
            return int((done / total) * 100)
        
        # Если это конечная задача (нет подзадач), смотрим на её собственный статус
        if obj.status == 'done':
            return 100
        elif obj.status == 'in_progress':
            return 50
        return 0

    def get_assignees_detail(self, obj):
        from apps.accounts.serializers import UserSerializer
        return UserSerializer(obj.assignees.all(), many=True).data

    def validate(self, data):
        due_date = data.get('due_date')
        if due_date and due_date < timezone.now():
            raise serializers.ValidationError(
                {'due_date': 'Срок выполнения не может быть в прошлом.'}
            )
        return data


class CommentSerializer(serializers.ModelSerializer):
    """Сериализатор для комментариев"""

    author_name = serializers.ReadOnlyField(source='author.username')

    class Meta:
        model = Comment
        fields = [
            'id',
            'task',
            'author',
            'author_name',
            'text',
            'created_at',
            'updated_at',
        ]
        # task и author отдаются из view/экшена автоматически
        read_only_fields = ['id', 'task', 'author', 'author_name', 'created_at', 'updated_at']


class AttachmentSerializer(serializers.ModelSerializer):
    """Сериализатор для вложений"""

    uploaded_by_name = serializers.ReadOnlyField(source='uploaded_by.username')

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
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at']