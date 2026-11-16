import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(name='Traveler', fields=[
            ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
            ('nickname', models.CharField(max_length=20)), ('avatar', models.CharField(max_length=24)),
            ('token_hash', models.CharField(max_length=64, unique=True)), ('created_at', models.DateTimeField(auto_now_add=True)),
        ]),
        migrations.CreateModel(name='Completion', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('scenario_id', models.CharField(max_length=32)), ('reward', models.PositiveIntegerField()),
            ('created_at', models.DateTimeField(auto_now_add=True)),
            ('traveler', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='world.traveler')),
        ], options={'constraints': [models.UniqueConstraint(fields=('traveler', 'scenario_id'), name='one_completion_per_scenario')]}),
        migrations.CreateModel(name='Attempt', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('scenario_id', models.CharField(max_length=32)), ('idempotency_key', models.CharField(max_length=80)),
            ('answers', models.JSONField()), ('result', models.JSONField()), ('created_at', models.DateTimeField(auto_now_add=True)),
            ('traveler', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='world.traveler')),
        ], options={'constraints': [models.UniqueConstraint(fields=('traveler', 'scenario_id', 'idempotency_key'), name='unique_attempt_key')]}),
        migrations.CreateModel(name='BehaviorEvent', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('event_id', models.CharField(max_length=80)), ('type', models.CharField(max_length=64)),
            ('properties', models.JSONField(default=dict)), ('client_timestamp', models.CharField(blank=True, max_length=50)),
            ('created_at', models.DateTimeField(auto_now_add=True)),
            ('traveler', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='world.traveler')),
        ], options={'constraints': [models.UniqueConstraint(fields=('traveler', 'event_id'), name='unique_behavior_event')],
                    'indexes': [models.Index(fields=['traveler', 'type'], name='world_event_traveler_type')]}),
        migrations.CreateModel(name='ChatMessage', fields=[
            ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
            ('room', models.CharField(db_index=True, max_length=40)), ('text', models.CharField(max_length=300)),
            ('created_at', models.DateTimeField(auto_now_add=True)),
            ('traveler', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='world.traveler')),
        ]),
        migrations.CreateModel(name='Presence', fields=[
            ('connection_id', models.CharField(max_length=100, primary_key=True, serialize=False)),
            ('room', models.CharField(db_index=True, max_length=40)), ('x', models.FloatField(default=50)),
            ('y', models.FloatField(default=68)), ('last_seen', models.DateTimeField(auto_now=True, db_index=True)),
            ('traveler', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='world.traveler')),
        ]),
    ]
