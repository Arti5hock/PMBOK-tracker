from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate

from .serializers import (
    UserPublicSerializer,
    UserSerializer,
    UserRegisterSerializer,
    UserModuleSettingsSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Регистрация нового пользователя"""
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Получение, обновление и удаление данных пользователя"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        # SECURITY: Всегда возвращаем только текущего пользователя
        return self.request.user
        
    # Переопределяем метод удаления для проверки пароля
    def destroy(self, request, *args, **kwargs):
        password = request.data.get('current_password')
        user = authenticate(username=request.user.username, password=password)
        
        if user is not None:
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        else:
            return Response(
                {'current_password': ['Неверный пароль. Подтверждение не пройдено.']}, 
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def update_module_settings(request):
    """Обновление настроек видимости модулей"""
    serializer = UserModuleSettingsSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        updated_settings = user.update_module_settings(serializer.validated_data)
        return Response({'module_settings': updated_settings})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    """Список пользователей для селекторов: только те, с кем есть общие проекты"""
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Владельцы и участники проектов, где состоит текущий пользователь, плюс он сам —
        # но не весь список пользователей системы.
        return User.objects.filter(
            Q(owned_projects__owner=user)
            | Q(owned_projects__members=user)
            | Q(assigned_projects__owner=user)
            | Q(assigned_projects__members=user)
            | Q(pk=user.pk)
        ).distinct()
    