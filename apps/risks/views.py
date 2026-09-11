from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import user_project_filter
from .models import Risk
from .serializers import RiskSerializer


class RiskViewSet(viewsets.ModelViewSet):
    """API для управления рисками проекта (PMBOK Risk Register)"""

    serializer_class = RiskSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['project', 'status', 'strategy']
    search_fields = ['title', 'description', 'response_plan']
    ordering_fields = ['score', 'probability', 'impact', 'created_at']
    ordering = ['-score']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Risk.objects.none()

        user = self.request.user
        if not user.is_authenticated:
            return Risk.objects.none()

        return Risk.objects.filter(user_project_filter(user)).distinct()

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Тепловая карта / сводка по уровням критичности рисков проекта"""
        project_id = request.query_params.get('project')
        qs = self.get_queryset()
        if project_id:
            qs = qs.filter(project_id=project_id)

        critical = qs.filter(score__gte=20).count()
        high = qs.filter(score__gte=15, score__lt=20).count()
        medium = qs.filter(score__gte=7, score__lt=15).count()
        low = qs.filter(score__lt=7).count()

        return Response({
            'total_risks': qs.count(),
            'by_severity': {
                'critical': critical,
                'high': high,
                'medium': medium,
                'low': low,
            },
            'by_strategy': qs.values('strategy').annotate(count=Count('id')),
        })