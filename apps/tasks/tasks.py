from datetime import timedelta
from celery import shared_task
from django.utils import timezone

from apps.notifications.models import Notification
from .models import Task, Milestone


@shared_task
def check_deadlines_and_notify():
    """Фоновый мониторинг дедлайнов задач и вех по PMBOK"""
    now = timezone.now()
    deadline_threshold = now + timedelta(hours=24)

    # 1. Задачи: не закрытые, дедлайн наступает в ближайшие 24 часа или уже просрочен
    urgent_tasks = Task.objects.filter(
        due_date__lte=deadline_threshold,
    ).exclude(status=Task.Status.DONE).select_related('project')

    created_notifications = 0

    for task in urgent_tasks:
        is_overdue = task.due_date < now
        subject = "ДЕМИДЛАЙН СОРВАН" if is_overdue else "Приближается дедлайн"
        message = (
            f"Задача [{task.wbs_code}] '{task.title}' в проекте '{task.project.name}' "
            f"{'просрочена!' if is_overdue else 'должна быть сдана в течение 24 часов!'}"
        )

        # Собираем получателей: исполнители + владелец проекта
        recipients = set(task.assignees.all())
        recipients.add(task.project.owner)

        for user in recipients:
            already_notified = Notification.objects.filter(
                recipient=user,
                task=task,
                created_at__gte=now - timedelta(hours=12),
                title__icontains="дедлайн",
            ).exists()

            if not already_notified:
                Notification.objects.create(
                    recipient=user,
                    task=task,
                    title=f"[{subject}] {task.title}",
                    message=message,
                )
                created_notifications += 1

    # 2. Контрольные точки (Milestones)
    urgent_milestones = Milestone.objects.filter(
        due_date__lte=deadline_threshold,
        status=Milestone.Status.PLANNED,
    ).select_related('project')

    for ms in urgent_milestones:
        is_overdue = ms.due_date < now
        ms_title = f"Контрольная точка {'просрочена' if is_overdue else 'требует сдачи'}: {ms.title}"
        ms_message = f"Веха '{ms.title}' проекта '{ms.project.name}' назначена на {ms.due_date.strftime('%Y-%m-%d %H:%M')}."

        already_notified = Notification.objects.filter(
            recipient=ms.project.owner,
            created_at__gte=now - timedelta(hours=12),
            title__icontains="Контрольная точка",
        ).exists()

        if not already_notified:
            Notification.objects.create(
                recipient=ms.project.owner,
                title=ms_title,
                message=ms_message,
            )
            created_notifications += 1

    return f"Проверка завершена. Создано уведомлений: {created_notifications}"