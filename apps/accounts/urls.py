from django.urls import path
from .views import RegisterView, UserDetailView, UserListView, update_module_settings

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', UserDetailView.as_view(), name='user_detail'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('module-settings/', update_module_settings, name='update_module_settings'),
]