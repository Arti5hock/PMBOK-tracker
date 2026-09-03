from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts'
    label = 'accounts'  # ЭТО ОБЯЗАТЕЛЬНО: связывает apps.accounts с 'accounts.User'