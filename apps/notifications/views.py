from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """API для просмотра и управления уведомлениями"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_read', 'notification_type']

    def get_queryset(self):
        # Защита Swagger-интроспекции
        if getattr(self, 'swagger_fake_view', False):
            return Notification.objects.none()

        user = self.request.user
        if not user.is_authenticated:
            return Notification.objects.none()

        return Notification.objects.filter(recipient=user)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Отметить конкретное уведомление как прочитанное"""
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Отметить все уведомления пользователя как прочитанные"""
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'success': True, 'message': 'Все уведомления прочитаны'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Получить количество непрочитанных уведомлений"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})