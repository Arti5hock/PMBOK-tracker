from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError


class Milestone(models.Model):
    class Status(models.TextChoices):
        PLANNED = 'planned', 'Запланирован'
        ACHIEVED = 'achieved', 'Достигнут'
        MISSED = 'missed', 'Просрочен'

    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='milestones',
        verbose_name='Проект',
    )
    title = models.CharField('Название вехи', max_length=255)
    description = models.TextField('Критерии приемки вехи', blank=True)
    due_date = models.DateTimeField('Срок контрольной точки')
    status = models.CharField(
        'Статус',
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNED,
    )

    class Meta:
        verbose_name = 'Контрольная точка (Milestone)'
        verbose_name_plural = 'Контрольные точки (Milestones)'
        ordering = ['due_date']

    def clean(self):
        super().clean()
        # PMBOK Phase Gate: нельзя закрыть Milestone, если есть незавершенные задачи
        if self.status == self.Status.ACHIEVED and self.pk:
            uncompleted = self.tasks.exclude(status=Task.Status.DONE).exists()
            if uncompleted:
                raise ValidationError(
                    'Нельзя закрыть контрольную точку: не все связанные рабочие пакеты (задачи) выполнены.'
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'[{self.project.name}] Milestone: {self.title}'
    
class Task(models.Model):
    """Модель задачи согласно ТЗ"""
    
    # Типы задач
    class Type(models.TextChoices):
        TASK = 'task', 'Задача'
        BUG = 'bug', 'Баг'
        STORY = 'story', 'История'
        EPIC = 'epic', 'Эпик'

    # Приоритеты
    class Priority(models.TextChoices):
        CRITICAL = 'critical', 'Critical'
        HIGH = 'high', 'High'
        MEDIUM = 'medium', 'Medium'
        LOW = 'low', 'Low'

    # Статусы (Канбан)
    class Status(models.TextChoices):
        BACKLOG = 'backlog', 'Backlog'
        TODO = 'todo', 'To Do'
        IN_PROGRESS = 'in_progress', 'In Progress'
        REVIEW = 'review', 'Review'
        DONE = 'done', 'Done'

    # Основные поля
    title = models.CharField('Название', max_length=200)
    description = models.TextField('Описание', blank=True)
    
    # Категоризация
    type = models.CharField(
        'Тип',
        max_length=10,
        choices=Type.choices,
        default=Type.TASK
    )
    priority = models.CharField(
        'Приоритет',
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM
    )
    status = models.CharField(
        'Статус',
        max_length=15,
        choices=Status.choices,
        default=Status.BACKLOG
    )
    
    # Оценка трудоемкости
    story_points = models.PositiveIntegerField(
        'Story Points',
        null=True,
        blank=True,
        help_text='Оценка трудоемкости в Story Points'
    )
    
    # Сроки
    due_date = models.DateTimeField(
        'Срок выполнения',
        null=True,
        blank=True
    )
    
    # Связи
    project = models.ForeignKey(
        'projects.Project',  # ← ВАЖНО: с префиксом apps.
        on_delete=models.CASCADE,
        related_name='tasks',
        verbose_name='Проект'
    )
    
    assignees = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='assigned_tasks',
        blank=True,
        verbose_name='Исполнители'
    )
    
    observers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='observed_tasks',
        blank=True,
        verbose_name='Наблюдатели'
    )

    milestone = models.ForeignKey(
        'tasks.Milestone',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks',
        verbose_name='Контрольная точка (Milestone)',
    )
    
    # Иерархия задач
    parent_task = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subtasks',
        verbose_name='Родительская задача'
    )
    
    # Порядок на доске
    order = models.PositiveIntegerField(
        'Порядок',
        default=0,
        help_text='Порядок отображения на Канбан-доске'
    )
    
    # Теги (связь с моделью Tag)
    tags = models.ManyToManyField(
        'Tag',  # Ссылка на модель Tag ниже
        blank=True,
        verbose_name='Теги'
    )
    
    # Временные метки
    created_at = models.DateTimeField(
        'Создана',
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        'Обновлена',
        auto_now=True
    )
    
    class Meta:
        verbose_name = 'Задача'
        verbose_name_plural = 'Задачи'
        ordering = ['order', '-created_at']

    @property
    def wbs_code(self) -> str:
        """Рекурсивная генерация иерархического WBS-кода (например, 1.2.1)"""
        chain = []
        curr = self
        while curr:
            chain.append(str(curr.order if curr.order else curr.id))
            curr = curr.parent_task
        return '.'.join(reversed(chain))
    
    def __str__(self):
        return f"{self.get_type_display()}: {self.title}"
    
    def is_overdue(self):
        """Проверка, просрочена ли задача"""
        if self.due_date and self.status != self.Status.DONE:
            return timezone.now() > self.due_date
        return False
    
    def get_progress(self):
        """Прогресс выполнения задачи (только для подзадач)"""
        if hasattr(self, 'subtasks') and self.subtasks.exists():
            done_count = self.subtasks.filter(status=self.Status.DONE).count()
            total_count = self.subtasks.count()
            return int((done_count / total_count) * 100)
        return 0


class Comment(models.Model):
    """Комментарии к задачам"""
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Задача'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Автор'
    )
    text = models.TextField('Текст комментария')
    created_at = models.DateTimeField('Создан', auto_now_add=True)
    updated_at = models.DateTimeField('Обновлен', auto_now=True)
    
    class Meta:
        verbose_name = 'Комментарий'
        verbose_name_plural = 'Комментарии'
        ordering = ['created_at']
    
    def __str__(self):
        return f"Комментарий к {self.task.title} от {self.author.username}"


class Attachment(models.Model):
    """Вложения к задачам"""
    
    # SECURITY: Разрешенные типы файлов для загрузки
    ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'txt', 'zip']
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name='Задача'
    )
    file = models.FileField(
        'Файл',
        upload_to='attachments/%Y/%m/%d/'
    )
    filename = models.CharField('Имя файла', max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_files',
        verbose_name='Загрузил'
    )
    uploaded_at = models.DateTimeField('Загружен', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Вложение'
        verbose_name_plural = 'Вложения'
    
    def __str__(self):
        return self.filename
    
    def clean(self):
        """SECURITY: Валидация загружаемых файлов"""
        super().clean()
        if self.file:
            # Проверка размера файла
            if self.file.size > self.MAX_FILE_SIZE:
                raise ValidationError(f'Размер файла не должен превышать 10 MB')
            
            # Проверка расширения файла
            ext = self.file.name.split('.')[-1].lower()
            if ext not in self.ALLOWED_EXTENSIONS:
                raise ValidationError(f'Недопустимый тип файла. Разрешены: {", ".join(self.ALLOWED_EXTENSIONS)}')


class Tag(models.Model):
    """Теги для задач"""
    
    name = models.CharField('Название', max_length=50, unique=True)
    color = models.CharField(
        'Цвет',
        max_length=7,
        default='#007bff',
        help_text='HEX цвет тега, например #007bff'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Тег'
        verbose_name_plural = 'Теги'
    
    def __str__(self):
        return self.name
    
class TaskRaciMatrix(models.Model):
    class Role(models.TextChoices):
        RESPONSIBLE = 'R', 'Responsible (Исполнитель)'
        ACCOUNTABLE = 'A', 'Accountable (Утверждающий)'
        CONSULTED = 'C', 'Consulted (Консультант)'
        INFORMED = 'I', 'Informed (Информируемый)'

    task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        related_name='raci_assignments',
        verbose_name='Задача',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='raci_roles',
        verbose_name='Пользователь',
    )
    role = models.CharField(
        'Роль RACI',
        max_length=1,
        choices=Role.choices,
    )
    notes = models.CharField('Примечание / Обязанности', max_length=255, blank=True)

    class Meta:
        verbose_name = 'Назначение RACI'
        verbose_name_plural = 'Матрица RACI'
        unique_together = ['task', 'user', 'role']

    def clean(self):
        super().clean()
        # В PMBOK у задачи может быть только один Accountable
        if self.role == self.Role.ACCOUNTABLE:
            existing = TaskRaciMatrix.objects.filter(
                task=self.task,
                role=self.Role.ACCOUNTABLE,
            ).exclude(pk=self.pk)
            if existing.exists():
                raise ValidationError('У задачи может быть только один утверждающий (Accountable).')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.task.title} - {self.user.username} [{self.role}]'