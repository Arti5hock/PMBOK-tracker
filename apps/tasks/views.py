from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Attachment, Comment, Milestone, Tag, Task, TaskRaciMatrix
from .serializers import (
    AttachmentSerializer,
    CommentSerializer,
    TagSerializer,
    TaskRaciMatrixSerializer,
    TaskSerializer,
    MilestoneSerializer
)

class TaskRaciMatrixViewSet(viewsets.ModelViewSet):
    """API управления ролями RACI матрицы проекта"""

    serializer_class = TaskRaciMatrixSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['task', 'role', 'user']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return TaskRaciMatrix.objects.none()

        user = self.request.user
        if not user.is_authenticated:
            return TaskRaciMatrix.objects.none()

        return TaskRaciMatrix.objects.filter(task__project__owner=user)

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                'project',
                openapi.IN_QUERY,
                description="ID проекта для построения сводной матрицы RACI",
                type=openapi.TYPE_INTEGER,
                required=True,
            )
        ]
    )
    @action(detail=False, methods=['get'])
    def project_matrix(self, request):
        """Полная сводная матрица RACI по проекту для отображения таблицы: Задачи x Участники"""
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'Параметр query project обязателен'}, status=400)

        tasks = Task.objects.filter(project_id=project_id, project__owner=request.user).exclude(status='done')
        result = []
        for task in tasks:
            assignments = task.raci_assignments.all().select_related('user')
            result.append({
                'task_id': task.id,
                'task_title': task.title,
                'matrix': {
                    'responsible': [a.user.username for a in assignments if a.role == TaskRaciMatrix.Role.RESPONSIBLE],
                    'accountable': [a.user.username for a in assignments if a.role == TaskRaciMatrix.Role.ACCOUNTABLE],
                    'consulted': [a.user.username for a in assignments if a.role == TaskRaciMatrix.Role.CONSULTED],
                    'informed': [a.user.username for a in assignments if a.role == TaskRaciMatrix.Role.INFORMED],
                }
            })
        return Response(result)

class MilestoneViewSet(viewsets.ModelViewSet):
    """API для управления контрольными точками (Milestones)"""

    serializer_class = MilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['project', 'status']
    ordering = ['due_date']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Milestone.objects.none()
        user = self.request.user
        if not user.is_authenticated:
            return Milestone.objects.none()
        return Milestone.objects.filter(project__owner=user)

class TaskViewSet(viewsets.ModelViewSet):
    """API для управления задачами"""

    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['project', 'type', 'priority', 'status', 'assignees']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'order', 'due_date']

    def get_queryset(self):
        # Защита от краша при автогенерации схемы Swagger
        if getattr(self, 'swagger_fake_view', False):
            return Task.objects.none()

        user = self.request.user
        if not user.is_authenticated:
            return Task.objects.none()

        # Правильное объединение условий через Q без конфликтов unique query
        return (
            Task.objects.filter(
                Q(project__owner=user)
                | Q(assignees=user)
                | Q(observers=user)
            )
            .distinct()
        )

    def perform_create(self, serializer):
        serializer.save()

    @swagger_auto_schema(
        operation_description="Изменить статус задачи",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['status'],
            properties={
                'status': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Новый статус задачи (например: backlog, todo, in_progress, review, done)"
                ),
            },
        ),
        responses={
            200: TaskSerializer,
            400: "Неверный статус или статус не указан",
        },
    )
    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """Изменить статус задачи"""
        task = self.get_object()
        new_status = request.data.get('status')

        if not new_status:
            return Response(
                {'error': 'Статус обязателен'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status not in dict(Task.Status.choices):
            return Response(
                {'error': 'Неверный статус'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task.status = new_status
        task.save()

        return Response(TaskSerializer(task).data)

    @swagger_auto_schema(
        operation_description="Добавить комментарий к задаче",
        request_body=CommentSerializer,
        responses={
            201: CommentSerializer,
            400: "Ошибка валидации",
        },
    )
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Добавить комментарий к задаче"""
        task = self.get_object()
        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(author=request.user, task=task)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                'project',
                openapi.IN_QUERY,
                description="ID проекта для построения дерева WBS",
                type=openapi.TYPE_INTEGER,
                required=True,
            )
        ]
    )
    @action(detail=False, methods=['get'])
    def wbs_tree(self, request):
        """Возвращает иерархическую структуру WBS с декомпозицией родительских задач и подзадач"""
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'Параметр query project обязателен'}, status=400)

        tasks = (
            Task.objects.filter(
                Q(project_id=project_id) &
                (Q(project__owner=request.user) | Q(project__members=request.user))
            )
            .select_related('milestone', 'parent_task')
            .order_by('order', 'id')
            .distinct()
        )

        def build_node(task):
            subtasks = [t for t in tasks if t.parent_task_id == task.id]
            total = len(subtasks)
            done = sum(1 for t in subtasks if t.status == Task.Status.DONE)
            progress = round((done / total) * 100) if total > 0 else (100 if task.status == Task.Status.DONE else 0)

            return {
                'id': task.id,
                'wbs_code': task.wbs_code,
                'title': task.title,
                'status': task.status,
                'milestone': task.milestone.title if task.milestone else None,
                'progress_percent': progress,
                'children': [build_node(child) for child in subtasks],
            }

        # Корневые элементы WBS (задачи без parent_task)
        root_tasks = [t for t in tasks if t.parent_task_id is None]
        tree = [build_node(root) for root in root_tasks]

        return Response(tree)


class CommentViewSet(viewsets.ModelViewSet):
    """API для управления комментариями"""

    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Comment.objects.none()
        return Comment.objects.all()

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class TagViewSet(viewsets.ModelViewSet):
    """API для управления тегами"""

    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Tag.objects.none()
        return Tag.objects.all()

class AttachmentViewSet(viewsets.ModelViewSet):
    """API для управления вложениями"""
    queryset = Attachment.objects.all()
    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Attachment.objects.none()
        return Attachment.objects.all()

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
        