import uuid
from django.db import models


class Traveler(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nickname = models.CharField(max_length=20)
    avatar = models.CharField(max_length=24)
    token_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Completion(models.Model):
    traveler = models.ForeignKey(Traveler, on_delete=models.CASCADE)
    scenario_id = models.CharField(max_length=32)
    reward = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['traveler', 'scenario_id'], name='one_completion_per_scenario')]


class Attempt(models.Model):
    traveler = models.ForeignKey(Traveler, on_delete=models.CASCADE)
    scenario_id = models.CharField(max_length=32)
    idempotency_key = models.CharField(max_length=80)
    answers = models.JSONField()
    result = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['traveler', 'scenario_id', 'idempotency_key'], name='unique_attempt_key')]


class BehaviorEvent(models.Model):
    traveler = models.ForeignKey(Traveler, on_delete=models.CASCADE)
    event_id = models.CharField(max_length=80)
    type = models.CharField(max_length=64)
    properties = models.JSONField(default=dict)
    client_timestamp = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['traveler', 'event_id'], name='unique_behavior_event')]
        indexes = [models.Index(fields=['traveler', 'type'], name='world_event_traveler_type')]


class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    traveler = models.ForeignKey(Traveler, on_delete=models.CASCADE)
    room = models.CharField(max_length=40, db_index=True)
    text = models.CharField(max_length=300)
    created_at = models.DateTimeField(auto_now_add=True)


class Presence(models.Model):
    # A lease makes presence consistent across ASGI workers without requiring Redis for storage.
    connection_id = models.CharField(primary_key=True, max_length=100)
    traveler = models.ForeignKey(Traveler, on_delete=models.CASCADE)
    room = models.CharField(max_length=40, db_index=True)
    x = models.FloatField(default=50)
    y = models.FloatField(default=68)
    last_seen = models.DateTimeField(auto_now=True, db_index=True)
