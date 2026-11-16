from django.urls import path, re_path
from world import views

urlpatterns = [
    path('api/health', views.health),
    path('api/scenarios', views.scenarios),
    path('api/sessions', views.create_session),
    path('api/progress', views.progress),
    path('api/scenarios/<str:scenario_id>/attempt', views.attempt),
    path('api/events', views.events),
    path('api/events/summary', views.event_summary),
    re_path(r'^(?P<path>.*)$', views.frontend),
]
