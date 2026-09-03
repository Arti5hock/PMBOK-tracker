from django.db.models import Q
from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend

from .models import Project
from .serializers import ProjectSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    """API для управления проектами"""
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'name', 'start_date', 'end_date']

    def get_queryset(self):
        # Защита от краша при интроспекции Swagger
        if getattr(self, 'swagger_fake_view', False):
            return Project.objects.none()

        user = self.request.user
        if not user.is_authenticated:
            return Project.objects.none()

        # Видят и владелец, и добавленные участники команды
        return Project.objects.filter(
            Q(owner=user) | Q(members=user)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)