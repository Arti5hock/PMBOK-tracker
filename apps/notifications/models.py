from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        TASK_ASSIGNED = 'task_assigned', 'Назначена задача'
        TASK_STATUS_CHANGED = 'task_status_changed', 'Изменен статус задачи'
        TASK_COMMENTED = 'task_commented', 'Новый комментарий'
        DEADLINE_APPROACHING = 'deadline_approaching', 'Приближается дедлайн'
        SYSTEM = 'system', 'Системное уведомление'

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='Получатель',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_notifications',
        verbose_name='Отправитель',
    )
    notification_type = models.CharField(
        'Тип уведомления',
        max_length=30,
        choices=Type.choices,
        default=Type.SYSTEM,
    )
    title = models.CharField('Заголовок', max_length=255)
    message = models.TextField('Сообщение')
    
    # Ссылка на связанную задачу (если применимо)
    task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name='Связанная задача',
    )
    
    is_read = models.BooleanField('Прочитано', default=False)
    created_at = models.DateTimeField('Дата создания', auto_now_add=True)

    class Meta:
        verbose_name = 'Уведомление'
        verbose_name_plural = 'Уведомления'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.recipient.username} | {self.get_notification_type_display()} | {self.title}'