from django.apps import apps
from django.contrib.auth import get_user_model

User = get_user_model()
Project = apps.get_model('projects', 'Project')
Task = apps.get_model('tasks', 'Task')

user = User.objects.first()

if not user:
    raise Exception("В базе нет пользователей! Создай суперпользователя.")

project = Project.objects.first()

if not project:
    project = Project.objects.create(
        name="Внедрение ERP PMBOK",
        description="Комплексный проект автоматизации процессов предприятия",
        status="active",
        owner=user
    )
    print(f"Создан новый проект: {project.name}")
else:
    print(f"Используем проект: {project.name}")

# Очищаем старые задачи
Task.objects.filter(project=project).delete()

# 1. Корневая фаза 1
phase_1 = Task.objects.create(
    project=project,
    title="1. Инициация и планирование",
    description="Разработка устава проекта и плана управления",
    status="done",
    priority="high",
    story_points=8,
    order=1
)

# 1.1 Дочерняя задача
Task.objects.create(
    project=project,
    parent_task=phase_1,
    title="Разработка Устава проекта",
    description="Формальная авторизация проекта стейкхолдерами",
    status="done",
    priority="critical",
    story_points=5,
    order=1
)

# 1.2 Дочерняя задача
Task.objects.create(
    project=project,
    parent_task=phase_1,
    title="Определение содержания и WBS",
    description="Декомпозиция продукта на пакеты работ",
    status="done",
    priority="high",
    story_points=3,
    order=2
)

# 2. Корневая фаза 2
phase_2 = Task.objects.create(
    project=project,
    title="2. Разработка и реализация",
    description="Создание функциональных модулей системы",
    status="in_progress",
    priority="critical",
    story_points=13,
    order=2
)

# 2.1 Дочерняя задача
Task.objects.create(
    project=project,
    parent_task=phase_2,
    title="Разработка REST API и аутентификации",
    description="Настройка JWT и эндпоинтов задач",
    status="done",
    priority="high",
    story_points=8,
    order=1
)

# 2.2 Дочерняя задача
Task.objects.create(
    project=project,
    parent_task=phase_2,
    title="Интерфейс WBS и Kanban-доска",
    description="Визуализация иерархии и перемещение карточек",
    status="in_progress",
    priority="medium",
    story_points=5,
    order=2
)

print("Все WBS-задачи успешно созданы!")