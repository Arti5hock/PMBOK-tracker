from rest_framework import serializers
from .models import Risk


class RiskSerializer(serializers.ModelSerializer):
    severity = serializers.ReadOnlyField()
    owner_name = serializers.ReadOnlyField(source='owner.username')
    task_title = serializers.ReadOnlyField(source='related_task.title')

    class Meta:
        model = Risk
        fields = [
            'id',
            'project',
            'title',
            'description',
            'probability',
            'impact',
            'score',
            'severity',
            'strategy',
            'response_plan',
            'status',
            'owner',
            'owner_name',
            'related_task',
            'task_title',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'score', 'severity', 'created_at', 'updated_at']