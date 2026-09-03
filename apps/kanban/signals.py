from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from apps.kanban.models import KanbanActivity, KanbanBoard, KanbanColumn


@receiver(post_save, sender='projects.Project')
def create_project_kanban_board(sender, instance, created, **kwargs):
    """Автоматическое создание канбан-доски и колонок для нового проекта"""
    if created:
        board = KanbanBoard.objects.create(project=instance)
        
        default_columns = [
            (KanbanColumn.Type.BACKLOG, 'Backlog', 1),
            (KanbanColumn.Type.TODO, 'To Do', 2),
            (KanbanColumn.Type.IN_PROGRESS, 'In Progress', 3),
            (KanbanColumn.Type.REVIEW, 'Review', 4),
            (KanbanColumn.Type.DONE, 'Done', 5),
        ]
        
        for col_type, col_name, order in default_columns:
            column = KanbanColumn.objects.create(
                project=instance,
                type=col_type,
                name=col_name,
                order=order,
            )
            board.columns.add(column)


@receiver(pre_save, sender='tasks.Task')
def log_task_status_change(sender, instance, **kwargs):
    """Фиксация старого статуса перед сохранением"""
    if instance.pk:
        try:
            old_task = sender.objects.get(pk=instance.pk)
            if old_task.status != instance.status:
                instance._old_status = old_task.status
        except sender.DoesNotExist:
            pass


@receiver(post_save, sender='tasks.Task')
def create_kanban_activity(sender, instance, created, **kwargs):
    """Создание записи активности при создании или перемещении задачи"""
    user = instance.project.owner

    if created:
        KanbanActivity.objects.create(
            task=instance,
            action=KanbanActivity.Action.CREATED,
            to_status=instance.status,
            user=user,
        )
    elif hasattr(instance, '_old_status'):
        KanbanActivity.objects.create(
            task=instance,
            action=KanbanActivity.Action.MOVED,
            from_status=instance._old_status,
            to_status=instance.status,
            user=user,
        )