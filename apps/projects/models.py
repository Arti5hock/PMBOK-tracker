from django.conf import settings
from django.db import models


class Project(models.Model):
    class Status(models.TextChoices):
        INITIATION = 'initiation', 'Инициация'
        PLANNING = 'planning', 'Планирование'
        EXECUTING = 'executing', 'Исполнение'
        MONITORING = 'monitoring', 'Мониторинг и контроль'
        CLOSING = 'closing', 'Завершение'
        ARCHIVED = 'archived', 'В архиве'

    name = models.CharField('Название проекта', max_length=200)
    description = models.TextField('Описание проекта', blank=True)
    status = models.CharField(
        'Статус проекта (PMBOK)',
        max_length=20,
        choices=Status.choices,
        default=Status.INITIATION,
    )
    start_date = models.DateField('Дата начала', null=True, blank=True)
    end_date = models.DateField('Плановая дата завершения', null=True, blank=True)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_projects',
        verbose_name='Руководитель проекта (Owner)',
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='assigned_projects',
        blank=True,
        verbose_name='Команда проекта',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Проект'
        verbose_name_plural = 'Проекты'
        ordering = ['-created_at']

    def __str__(self):
        return self.name