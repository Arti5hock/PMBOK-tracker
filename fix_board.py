from django.apps import apps

Project = apps.get_model('projects', 'Project')
KanbanBoard = apps.get_model('kanban', 'KanbanBoard')
KanbanColumn = apps.get_model('kanban', 'KanbanColumn')

project = Project.objects.first()

if not project:
    print("Проект не найден!")
else:
    # Проверяем, есть ли уже доска у проекта
    if not hasattr(project, 'kanban_board'):
        # Создаем саму доску
        board = KanbanBoard.objects.create(project=project)
        
        # Создаем стандартные колонки (как в твоих сигналах)
        default_columns = [
            ('backlog', 'Backlog', 1),
            ('todo', 'To Do', 2),
            ('in_progress', 'In Progress', 3),
            ('review', 'Review', 4),
            ('done', 'Done', 5),
        ]
        
        for col_type, col_name, order in default_columns:
            column = KanbanColumn.objects.create(
                project=project,
                type=col_type,
                name=col_name,
                order=order,
            )
            board.columns.add(column)
            
        print(f"Канбан-доска и колонки для проекта '{project.name}' успешно созданы!")
    else:
        print(f"У проекта '{project.name}' уже есть доска.")