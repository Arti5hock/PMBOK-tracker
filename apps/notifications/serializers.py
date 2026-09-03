from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.username')
    task_title = serializers.ReadOnlyField(source='task.title')

    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'sender',
            'sender_name',
            'notification_type',
            'title',
            'message',
            'task',
            'task_title',
            'is_read',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'recipient',
            'sender',
            'notification_type',
            'title',
            'message',
            'task',
            'created_at',
        ]