"""Общие хелперы для вьюх всех приложений."""

from django.db.models import Q


def user_project_filter(user, prefix: str = 'project') -> Q:
    """Q-условие: проекты, где пользователь — владелец или участник команды.

    prefix позволяет применить условие к связанному полю (`project`, `task__project`).
    """
    return (
        Q(**{f'{prefix}__owner': user})
        | Q(**{f'{prefix}__members': user})
    )
