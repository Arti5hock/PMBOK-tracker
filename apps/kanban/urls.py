from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import KanbanColumnViewSet, KanbanBoardViewSet, KanbanActivityViewSet

router = DefaultRouter()
router.register('columns', KanbanColumnViewSet, basename='kanban-column')
router.register('boards', KanbanBoardViewSet, basename='kanban-board')
router.register('activities', KanbanActivityViewSet, basename='kanban-activity')

urlpatterns = [
    path('', include(router.urls)),
]