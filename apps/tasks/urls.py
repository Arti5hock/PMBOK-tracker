from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttachmentViewSet, MilestoneViewSet, TaskViewSet, CommentViewSet, TagViewSet
from .views import TaskRaciMatrixViewSet


router = DefaultRouter()
router.register('tasks', TaskViewSet, basename='task')
router.register('comments', CommentViewSet, basename='comment')
router.register('tags', TagViewSet, basename='tag')
router.register('raci', TaskRaciMatrixViewSet, basename='task-raci')
router.register('milestones', MilestoneViewSet, basename='milestone')
router.register('attachments', AttachmentViewSet, basename='attachment')

urlpatterns = [
    path('', include(router.urls)),
]