from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
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


urlpatterns = [
    path('', home, name='home'),
    path('admin/', admin.site.urls),

    # SECURITY: схема и UI доступны только авторизованным пользователям
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path(
        'swagger/',
        SpectacularSwaggerView.as_view(url_name='schema'),
        name='schema-swagger-ui',
    ),
    path(
        'redoc/',
        SpectacularRedocView.as_view(url_name='schema'),
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