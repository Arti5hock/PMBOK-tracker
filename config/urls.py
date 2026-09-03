from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path, re_path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


def home(request):
    return HttpResponse("""
        <h1>🚀 Task Tracker API</h1>
        <p>Добро пожаловать в Task Tracker!</p>
        <p>📚 <a href="/swagger/">Swagger документация</a></p>
        <p>🔑 <a href="/admin/">Админка</a></p>
    """)


schema_view = get_schema_view(
    openapi.Info(
        title="Task Tracker API",
        default_version='v1',
        description="API для управления задачами по методологии PMBOK",
        contact=openapi.Contact(email="support@tasktracker.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    path('', home, name='home'),
    path('admin/', admin.site.urls),

    # Документация Swagger и ReDoc
    re_path(
        r'^swagger(?P<format>\.json|\.yaml)$',
        schema_view.without_ui(cache_timeout=0),
        name='schema-json',
    ),
    path(
        'swagger/',
        schema_view.with_ui('swagger', cache_timeout=0),
        name='schema-swagger-ui',
    ),
    path(
        'redoc/',
        schema_view.with_ui('redoc', cache_timeout=0),
        name='schema-redoc',
    ),

    # JWT аутентификация
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # API приложений
    path('api/auth/', include('apps.accounts.urls')),
    path('api/', include('apps.projects.urls')),
    path('api/', include('apps.tasks.urls')),
    path('api/kanban/', include('apps.kanban.urls')),
    path('api/', include('apps.notifications.urls')),
    path('api/', include('apps.risks.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)