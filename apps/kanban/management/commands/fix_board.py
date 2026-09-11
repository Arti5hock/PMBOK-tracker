from django.core.management.base import BaseCommand

from apps.kanban.models import KanbanBoard, KanbanColumn
from apps.projects.models import Project

DEFAULT_COLUMNS = [
    ('backlog', 'Backlog', 1, None),
    ('todo', 'To Do', 2, None),
    ('in_progress', 'In Progress', 3, 3),
    ('review', 'Review', 4, 2),
    ('done', 'Done', 5, None),
]


class Command(BaseCommand):
    help = 'Создаёт Канбан-доску со стандартными колонками для проектов, у которых её ещё нет.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--project-id',
            type=int,
            default=None,
            help='ID проекта. Без флага обрабатываются все проекты без доски.',
        )

    def handle(self, *args, **options):
        projects = Project.objects.all()
        if options['project_id']:
            projects = projects.filter(pk=options['project_id'])

        created = 0
        for project in projects:
            if hasattr(project, 'kanban_board'):
                self.stdout.write(f'У проекта "{project.name}" уже есть доска.')
                continue

            board = KanbanBoard.objects.create(project=project)
            for col_type, col_name, order, wip_limit in DEFAULT_COLUMNS:
                column = KanbanColumn.objects.create(
                    project=project,
                    type=col_type,
                    name=col_name,
                    order=order,
                    wip_limit=wip_limit,
                )
                board.columns.add(column)
            created += 1

        self.stdout.write(
            self.style.SUCCESS(f'Готово. Создано досок: {created}.')
        )
