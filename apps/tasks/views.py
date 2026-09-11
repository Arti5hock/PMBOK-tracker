from collections import defaultdict

from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import filters, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import user_project_filter
from .models import Attachment, Comment, Milestone, Tag, Task, TaskRaciMatrix
from .serializers import (
    AttachmentSerializer,
    CommentSerializer,
    TagSerializer,
    TaskRaciMatrixSerializer,
    TaskSerializer,
    MilestoneSerializer,
)


class ChangeStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=Task.Status.choices,
        help_text='Новый статус задачи',
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

        return TaskRaciMatrix.objects.filter(
            user_project_filter(user, 'task__project')
        ).distinct()

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='project',
                type=int,
                location=OpenApiParameter.QUERY,
                description="ID проекта для построения сводной матрицы RACI",
                required=True,
            )
        ],
        responses={200: TaskRaciMatrixSerializer(many=True)},
    )
    @action(detail=False, methods=['get'])
    def project_matrix(self, request):
        """Полная сводная матрица RACI по проекту для отображения таблицы: Задачи x Участники"""
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'Параметр query project обязателен'}, status=400)

        tasks = (
            Task.objects.filter(
                user_project_filter(request.user) & Q(project_id=project_id)
            )
            .exclude(status='done')
            .distinct()
        )
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
        return Milestone.objects.filter(user_project_filter(user)).distinct()


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

        return (
            Task.objects.filter(
                user_project_filter(user)
                | Q(assignees=user)
                | Q(observers=user)
            )
            .distinct()
        )

    def perform_create(self, serializer):
        serializer.save()

    @extend_schema(
        summary="Изменить статус задачи",
        request=ChangeStatusSerializer,
        responses={200: TaskSerializer},
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

    @extend_schema(
        summary="Добавить комментарий к задаче",
        request=CommentSerializer,
        responses={201: CommentSerializer},
    )
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Добавить комментарий к задаче"""
        task = self.get_object()
        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(author=request.user, task=task)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='project',
                type=int,
                location=OpenApiParameter.QUERY,
                description="ID проекта для построения дерева WBS",
                required=True,
            )
        ],
        responses={200: OpenApiResponse(description="Иерархическое дерево WBS")},
    )
    @action(detail=False, methods=['get'])
    def wbs_tree(self, request):
        """Возвращает иерархическую структуру WBS с декомпозицией родительских задач и подзадач"""
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'Параметр query project обязателен'}, status=400)

        tasks = (
            Task.objects.filter(
                user_project_filter(request.user) & Q(project_id=project_id)
            )
            .select_related('milestone', 'parent_task')
            .order_by('order', 'id')
            .distinct()
        )

        # Группируем подзадачи один раз, чтобы не сканировать весь список на каждом узле
        children_by_parent = defaultdict(list)
        for task in tasks:
            children_by_parent[task.parent_task_id].append(task)

        # WBS-коды считаем одним проходом сверху вниз и кэшируем на объектах,
        # иначе свойство task.wbs_code поднимается по цепочке parent_task (N+1).
        def assign_wbs_codes(task, parent_code):
            segment = str(task.order if task.order else task.id)
            task.wbs_code_cached = f'{parent_code}.{segment}' if parent_code else segment
            for child in children_by_parent[task.id]:
                assign_wbs_codes(child, task.wbs_code_cached)

        def build_node(task):
            subtasks = children_by_parent[task.id]
            total = len(subtasks)
            done = sum(1 for t in subtasks if t.status == Task.Status.DONE)
            progress = round((done / total) * 100) if total > 0 else (100 if task.status == Task.Status.DONE else 0)

            return {
                'id': task.id,
                'wbs_code': task.wbs_code_cached,
                'title': task.title,
                'status': task.status,
                'milestone': task.milestone.title if task.milestone else None,
                'progress_percent': progress,
                'children': [build_node(child) for child in subtasks],
            }

        # Корневые элементы WBS (задачи без parent_task)
        root_tasks = children_by_parent[None]

        for root in root_tasks:
            assign_wbs_codes(root, '')

        return Response([build_node(root) for root in root_tasks])


class CommentViewSet(viewsets.ModelViewSet):
    """API для управления комментариями"""

    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Comment.objects.none()
        user = self.request.user
        if not user.is_authenticated:
            return Comment.objects.none()
        return Comment.objects.filter(
            user_project_filter(user, 'task__project')
        ).distinct()

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
    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Attachment.objects.none()
        user = self.request.user
        if not user.is_authenticated:
            return Attachment.objects.none()
        return Attachment.objects.filter(
            user_project_filter(user, 'task__project')
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
        