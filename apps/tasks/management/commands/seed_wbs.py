from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from apps.projects.models import Project
from apps.tasks.models import Task


class Command(BaseCommand):
    help = (
        'Создаёт демонстрационную WBS-структуру задач в первом проекте. '
        'ВНИМАНИЕ: удаляет все существующие задачи выбранного проекта.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--project-id',
            type=int,
            default=None,
            help='ID проекта. По умолчанию берётся первый проект в базе.',
        )
        parser.add_argument(
            '--owner',
            default=None,
            help='Username владельца для создаваемого проекта (по умолчанию — первый пользователь).',
        )
        parser.add_argument(
            '--no-input',
            action='store_true',
            help='Не запрашивать подтверждение удаления существующих задач.',
        )

    def handle(self, *args, **options):
        User = get_user_model()

        if options['owner']:
            try:
                user = User.objects.get(username=options['owner'])
            except User.DoesNotExist:
                raise CommandError(f'Пользователь "{options["owner"]}" не найден.')
        else:
            user = User.objects.first()
            if not user:
                raise CommandError(
                    'В базе нет пользователей. Создайте суперпользователя: manage.py createsuperuser'
                )

        project_id = options['project_id']
        if project_id:
            try:
                project = Project.objects.get(pk=project_id)
            except Project.DoesNotExist:
                raise CommandError(f'Проект с id={project_id} не найден.')
        else:
            project = Project.objects.first()

        if not project:
            project = Project.objects.create(
                name='Внедрение ERP PMBOK',
                description='Комплексный проект автоматизации процессов предприятия',
                status=Project.Status.INITIATION,
                owner=user,
            )
            self.stdout.write(f'Создан новый проект: {project.name}')
        else:
            self.stdout.write(f'Используем проект: {project.name}')

        existing = Task.objects.filter(project=project).count()
        if existing and not options['no_input']:
            confirm = input(
                f'В проекте "{project.name}" уже есть задачи ({existing} шт.). '
                'Они будут удалены. Продолжить? [y/N]: '
            )
            if confirm.strip().lower() not in ('y', 'yes', 'д', 'да'):
                self.stdout.write(self.style.WARNING('Отменено.'))
                return

        Task.objects.filter(project=project).delete()

        phase_1 = Task.objects.create(
            project=project,
            title='1. Инициация и планирование',
            description='Разработка устава проекта и плана управления',
            status=Task.Status.DONE,
            priority=Task.Priority.HIGH,
            story_points=8,
            order=1,
        )

        Task.objects.create(
            project=project,
            parent_task=phase_1,
            title='Разработка Устава проекта',
            description='Формальная авторизация проекта стейкхолдерами',
            status=Task.Status.DONE,
            priority=Task.Priority.CRITICAL,
            story_points=5,
            order=1,
        )

        Task.objects.create(
            project=project,
            parent_task=phase_1,
            title='Определение содержания и WBS',
            description='Декомпозиция продукта на пакеты работ',
            status=Task.Status.DONE,
            priority=Task.Priority.HIGH,
            story_points=3,
            order=2,
        )

        phase_2 = Task.objects.create(
            project=project,
            title='2. Разработка и реализация',
            description='Создание функциональных модулей системы',
            status=Task.Status.IN_PROGRESS,
            priority=Task.Priority.CRITICAL,
            story_points=13,
            order=2,
        )

        Task.objects.create(
            project=project,
            parent_task=phase_2,
            title='Разработка REST API и аутентификации',
            description='Настройка JWT и эндпоинтов задач',
            status=Task.Status.DONE,
            priority=Task.Priority.HIGH,
            story_points=8,
            order=1,
        )

        Task.objects.create(
            project=project,
            parent_task=phase_2,
            title='Интерфейс WBS и Kanban-доска',
            description='Визуализация иерархии и перемещение карточек',
            status=Task.Status.IN_PROGRESS,
            priority=Task.Priority.MEDIUM,
            story_points=5,
            order=2,
        )

        self.stdout.write(self.style.SUCCESS('Все WBS-задачи успешно созданы!'))
