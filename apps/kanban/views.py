from rest_framework import filters, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema
from apps.common.permissions import user_project_filter
from apps.tasks.models import Task
from .models import KanbanActivity, KanbanBoard, KanbanColumn
from .serializers import (
    KanbanActivitySerializer,
    KanbanBoardSerializer,
    KanbanColumnSerializer,
)


class MoveTaskSerializer(serializers.Serializer):
    task_id = serializers.IntegerField(help_text='ID задачи')
    status = serializers.ChoiceField(
        choices=Task.Status.choices,
        help_text='Новый статус задачи',
    )


class KanbanColumnViewSet(viewsets.ModelViewSet):
    """API для управления колонками Канбан"""

    serializer_class = KanbanColumnSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['order']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return KanbanColumn.objects.none()

        user = self.request.user
        if not user.is_authenticated:
            return KanbanColumn.objects.none()

        return KanbanColumn.objects.filter(user_project_filter(user)).distinct()


class KanbanBoardViewSet(viewsets.ModelViewSet):
    """API для управления Канбан-досками"""

    serializer_class = KanbanBoardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return KanbanBoard.objects.none()

        user = self.request.user
        if not user.is_authenticated:
            return KanbanBoard.objects.none()

        return KanbanBoard.objects.filter(user_project_filter(user)).distinct()

    @extend_schema(
        summary="Переместить задачу между колонками",
        request=MoveTaskSerializer,
        responses={200: KanbanBoardSerializer},
    )
    @action(detail=True, methods=['post'])
    def move_task(self, request, pk=None):
        """Переместить задачу между колонками"""
        board = self.get_object()
        task_id = request.data.get('task_id')
        new_status = request.data.get('status')

        if not task_id or not new_status:
            return Response(
                {'error': 'task_id и status обязательны'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            task = Task.objects.get(id=task_id, project=board.project)
        except Task.DoesNotExist:
            return Response(
                {'error': 'Задача не найдена в рамках данного проекта'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Проверяем WIP лимит колонки назначения (исключая саму перемещаемую задачу)
        try:
            column = KanbanColumn.objects.get(
                project=board.project, type=new_status
            )
            if column.is_wip_limit_reached(exclude_task_id=task.id):
                return Response(
                    {'error': f'WIP-лимит для колонки "{column.name}" достигнут.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except KanbanColumn.DoesNotExist:
            return Response(
                {'error': 'Колонка с указанным статусом не существует в проекте'},
                status=status.HTTP_404_NOT_FOUND,
            )

        task.status = new_status
        task.save()

        return Response({'success': True, 'task_id': task.id, 'new_status': new_status})


class KanbanActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """API для просмотра активности Канбан"""

    serializer_class = KanbanActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-timestamp']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return KanbanActivity.objects.none()

        user = self.request.user
        if not user.is_authenticated:
            return KanbanActivity.objects.none()

        return KanbanActivity.objects.filter(
            user_project_filter(user, 'task__project')
        ).distinct()