from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Сериализатор для пользователя"""
    module_settings = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'avatar', 'module_settings']
        read_only_fields = ['id']
    
    def get_module_settings(self, obj):
        return obj.get_module_settings()


class UserModuleSettingsSerializer(serializers.Serializer):
    """Сериализатор для настроек модулей"""
    kanban = serializers.BooleanField(required=False)
    raci = serializers.BooleanField(required=False)
    milestones = serializers.BooleanField(required=False)
    risks = serializers.BooleanField(required=False)


class UserRegisterSerializer(serializers.ModelSerializer):
    """Сериализатор для регистрации"""
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']
    
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Пароли не совпадают")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user