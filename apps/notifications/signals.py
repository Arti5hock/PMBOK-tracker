from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from apps.tasks.models import Comment, Task
from .models import Notification


@receiver(post_save, sender=Comment)
def notify_on_comment(sender, instance, created, **kwargs):
    """Создать уведомления наблюдателям и исполнителям при новом комментарии"""
    if not created:
        return

    task = instance.task
    comment_author = instance.author

    # Собираем всех заинтересованных: исполнителей, наблюдателей и владельца проекта
    recipients = set(task.assignees.all()) | set(task.observers.all())
    recipients.add(task.project.owner)

    for recipient in recipients:
        # Автору комментария уведомление не шлём
        if recipient != comment_author:
            Notification.objects.create(
                recipient=recipient,
                sender=comment_author,
                notification_type=Notification.Type.TASK_COMMENTED,
                title=f'Новый комментарий в задаче "{task.title}"',
                message=f'{comment_author.username}: {instance.text[:100]}',
                task=task,
            )


@receiver(m2m_changed, sender=Task.assignees.through)
def notify_on_task_assignment(sender, instance, action, pk_set, **kwargs):
    """Оповещение исполнителя при назначении на задачу"""
    if action == 'post_add' and pk_set:
        from django.contrib.auth import get_user_model
        User = get_user_model()

        for user_id in pk_set:
            user = User.objects.filter(id=user_id).first()
            if user:
                Notification.objects.create(
                    recipient=user,
                    sender=instance.project.owner,
                    notification_type=Notification.Type.TASK_ASSIGNED,
                    title=f'Вам назначена задача "{instance.title}"',
                    message=f'Вы были назначены исполнителем в проекте "{instance.project.name}".',
                    task=instance,
                )