from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Risk(models.Model):
    class Status(models.TextChoices):
        IDENTIFIED = 'identified', 'Идентифицирован'
        ANALYZED = 'analyzed', 'Проанализирован'
        ACTION_REQUIRED = 'action_required', 'Требует мер'
        MITIGATED = 'mitigated', 'Минимизирован'
        OCCURRED = 'occurred', 'Наступил (Инцидент)'
        CLOSED = 'closed', 'Закрыт'

    class Strategy(models.TextChoices):
        AVOID = 'avoid', 'Уклонение (Avoid)'
        MITIGATE = 'mitigate', 'Снижение (Mitigate)'
        TRANSFER = 'transfer', 'Передача (Transfer)'
        ACCEPT = 'accept', 'Принятие (Accept)'

    class SeverityLevel(models.TextChoices):
        LOW = 'low', 'Низкий (1-6)'
        MEDIUM = 'medium', 'Средний (7-14)'
        HIGH = 'high', 'Высокий (15-19)'
        CRITICAL = 'critical', 'Критический (20-25)'

    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='risks',
        verbose_name='Проект',
    )
    title = models.CharField('Наименование риска', max_length=255)
    description = models.TextField('Описание и триггеры риска')
    
    # Матрица P x I (шкала от 1 до 5)
    probability = models.PositiveSmallIntegerField(
        'Вероятность (1-5)',
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='1 - Очень низкая, 5 - Почти неизбежно',
    )
    impact = models.PositiveSmallIntegerField(
        'Влияние (1-5)',
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='1 - Минимальное, 5 - Катастрофическое',
    )
    
    # Автоматически вычисляемый балл риска
    score = models.PositiveSmallIntegerField('Оценка риска (P x I)', editable=False)

    strategy = models.CharField(
        'Стратегия реагирования',
        max_length=20,
        choices=Strategy.choices,
        default=Strategy.MITIGATE,
    )
    response_plan = models.TextField('План реагирования / Контрмеры', blank=True)
    
    status = models.CharField(
        'Статус риска',
        max_length=20,
        choices=Status.choices,
        default=Status.IDENTIFIED,
    )
    
    # Ответственное лицо за мониторинг риска
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_risks',
        verbose_name='Владелец риска',
    )
    
    # Опциональная связь с уязвимой задачей
    related_task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='associated_risks',
        verbose_name='Связанная задача',
    )

    created_at = models.DateTimeField('Дата выявления', auto_now_add=True)
    updated_at = models.DateTimeField('Дата обновления', auto_now=True)

    class Meta:
        verbose_name = 'Риск'
        verbose_name_plural = 'Реестр рисков'
        ordering = ['-score', '-impact']

    def save(self, *args, **kwargs):
        # Автоматический пересчет оценки риска P x I
        self.score = self.probability * self.impact
        super().save(*args, **kwargs)

    @property
    def severity(self) -> str:
        if self.score >= 20:
            return self.SeverityLevel.CRITICAL
        elif self.score >= 15:
            return self.SeverityLevel.HIGH
        elif self.score >= 7:
            return self.SeverityLevel.MEDIUM
        return self.SeverityLevel.LOW

    def __str__(self):
        return f'[{self.project.name}] {self.title} (Score: {self.score})'