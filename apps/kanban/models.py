from django.conf import settings
from django.db import models


class KanbanColumn(models.Model):
    """Модель колонки Канбан-доски"""

    class Type(models.TextChoices):
        BACKLOG = 'backlog', 'Backlog'
        TODO = 'todo', 'To Do'
        IN_PROGRESS = 'in_progress', 'In Progress'
        REVIEW = 'review', 'Review'
        DONE = 'done', 'Done'

    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='kanban_columns',
    )
    type = models.CharField(max_length=15, choices=Type.choices)
    name = models.CharField(max_length=50)
    wip_limit = models.PositiveIntegerField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']
        unique_together = ['project', 'type']

    def is_wip_limit_reached(self, exclude_task_id=None):
        """Достигнут ли WIP-лимит колонки.

        exclude_task_id исключает перемещаемую задачу из подсчёта, иначе задача,
        уже находящаяся в этой колонке, считалась бы дважды.
        """
        if self.wip_limit is None:
            return False
        from apps.tasks.models import Task

        tasks = Task.objects.filter(project=self.project, status=self.type)
        if exclude_task_id is not None:
            tasks = tasks.exclude(pk=exclude_task_id)
        return tasks.count() >= self.wip_limit

    def __str__(self):
        return f'{self.project.name} - {self.name}'


class KanbanBoard(models.Model):
    """Модель Канбан-доски"""

    project = models.OneToOneField(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='kanban_board',
    )
    columns = models.ManyToManyField(
        'kanban.KanbanColumn', related_name='boards'
    )
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Канбан: {self.project.name}'


class KanbanActivity(models.Model):
    """Лог перемещений задач"""

    class Action(models.TextChoices):
        MOVED = 'moved', 'Перемещена'
        CREATED = 'created', 'Создана'
        UPDATED = 'updated', 'Обновлена'
        DELETED = 'deleted', 'Удалена'

    task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        related_name='kanban_activities',
    )
    action = models.CharField(max_length=10, choices=Action.choices)
    from_status = models.CharField(max_length=15, null=True, blank=True)
    to_status = models.CharField(max_length=15, null=True, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='kanban_activities',
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.task.title} - {self.get_action_display()}'