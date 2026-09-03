from rest_framework import serializers
from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    """Сериализатор для проекта (PMBOK)"""
    owner_name = serializers.ReadOnlyField(source='owner.username')

    class Meta:
        model = Project
        fields = [
            'id',
            'name',
            'description',
            'status',
            'start_date',
            'end_date',
            'owner',
            'owner_name',
            'members',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']