from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from .serializers import UserSerializer, UserRegisterSerializer

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

class UserListView(generics.ListAPIView):
    """Получение списка всех пользователей для селекторов"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    