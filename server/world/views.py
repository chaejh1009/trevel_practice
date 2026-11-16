import json
import re
from functools import wraps
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, HttpResponse, JsonResponse
from django.views.decorators.http import require_GET, require_POST

from .contracts import TravelerRepository
from .repositories import DjangoTravelerRepository
from .scenarios import SCENARIOS, SCENARIO_BY_ID

repository: TravelerRepository = DjangoTravelerRepository()


def api_error(message, status=400):
    return JsonResponse({'error': message}, status=status)


def body(request):
    if len(request.body) > 65536:
        raise ValueError('요청이 너무 큽니다.')
    try:
        value = json.loads(request.body)
    except (ValueError, UnicodeError, RecursionError):
        raise ValueError('올바른 JSON 요청이 필요합니다.')
    if not isinstance(value, dict):
        raise ValueError('JSON 객체가 필요합니다.')
    return value


def authenticated(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        authorization = request.headers.get('Authorization', '')
        traveler = repository.authenticate(authorization[7:] if authorization.startswith('Bearer ') else '')
        if traveler is None:
            return api_error('여행자 세션이 필요합니다. 다시 입장해 주세요.', 401)
        request.traveler = traveler
        return view(request, *args, **kwargs)
    return wrapped


@require_GET
def health(request):
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute('SELECT 1')
    return JsonResponse({'status': 'ok', 'database': connection.vendor, 'realtime': 'redis' if settings.REDIS_URL else 'in-memory'})


@require_GET
def scenarios(request):
    return JsonResponse({'scenarios': SCENARIOS})


@require_POST
def create_session(request):
    try:
        data = body(request)
        nickname = data.get('nickname', '')
        avatar = data.get('avatar', 'explorer')
        if not isinstance(nickname, str) or not 1 <= len(nickname.strip()) <= 20 or any(ord(char) < 32 for char in nickname):
            raise ValueError('닉네임은 1~20자의 글자로 입력해 주세요.')
        nickname.encode('utf-8')
        if not isinstance(avatar, str) or not re.fullmatch(r'[\w-]{1,24}', avatar):
            raise ValueError('올바른 아바타를 선택해 주세요.')
        return JsonResponse(repository.create_session(nickname.strip(), avatar), status=201)
    except ValueError as exc:
        return api_error(str(exc))


@require_GET
@authenticated
def progress(request):
    return JsonResponse(repository.progress(request.traveler.id))


@require_POST
@authenticated
def attempt(request, scenario_id):
    if scenario_id not in SCENARIO_BY_ID:
        return api_error('체험을 찾을 수 없습니다.', 404)
    try:
        data = body(request)
        answers = data.get('answers')
        key = data.get('idempotencyKey')
        steps = SCENARIO_BY_ID[scenario_id]['steps']
        if not isinstance(key, str) or not re.fullmatch(r'[a-zA-Z0-9_:-]{1,80}', key):
            raise ValueError('올바른 요청 키가 필요합니다.')
        if not isinstance(answers, list) or len(answers) != len(steps):
            raise ValueError('모든 질문에 답해 주세요.')
        for answer, step in zip(answers, steps):
            if not isinstance(answer, str) or answer not in [option['id'] for option in step['options']]:
                raise ValueError('유효한 보기를 선택해 주세요.')
        return JsonResponse(repository.submit_attempt(request.traveler.id, scenario_id, answers, key))
    except ValueError as exc:
        return api_error(str(exc), 409 if '같은 요청 키' in str(exc) else 400)


@require_POST
@authenticated
def events(request):
    try:
        data = body(request)
        entries = data.get('events')
        if not isinstance(entries, list) or not 1 <= len(entries) <= 50:
            raise ValueError('한 번에 1~50개의 이벤트를 전송해 주세요.')
        for event in entries:
            if not isinstance(event, dict):
                raise ValueError('이벤트 형식이 올바르지 않습니다.')
            if not isinstance(event.get('id'), str) or not re.fullmatch(r'[a-zA-Z0-9_:-]{1,80}', event['id']):
                raise ValueError('이벤트 ID가 올바르지 않습니다.')
            if not isinstance(event.get('type'), str) or not re.fullmatch(r'[a-zA-Z0-9_.:-]{1,64}', event['type']):
                raise ValueError('이벤트 이름이 올바르지 않습니다.')
            if not isinstance(event.get('properties', {}), dict) or len(json.dumps(event.get('properties', {}), allow_nan=False)) > 4096:
                raise ValueError('이벤트 속성이 너무 크거나 형식이 올바르지 않습니다.')
            if not isinstance(event.get('timestamp', ''), str) or len(event.get('timestamp', '')) > 50:
                raise ValueError('이벤트 시간이 올바르지 않습니다.')
            event.get('timestamp', '').encode('utf-8')
        return JsonResponse({'accepted': repository.collect_events(request.traveler.id, entries)})
    except ValueError as exc:
        return api_error(str(exc))


@require_GET
@authenticated
def event_summary(request):
    return JsonResponse(repository.event_summary(request.traveler.id))


def frontend(request, path=''):
    if path.startswith(('api/', 'ws/')):
        return api_error('경로를 찾을 수 없습니다.', 404)
    root = settings.FRONTEND_DIST.resolve()
    candidate = (root / path).resolve()
    if not candidate.is_relative_to(root):
        return api_error('잘못된 경로입니다.', 400)
    if path and candidate.is_file():
        return FileResponse(candidate.open('rb'))
    index = root / 'index.html'
    if index.is_file():
        return FileResponse(index.open('rb'), content_type='text/html; charset=utf-8')
    return HttpResponse('프런트엔드 개발 서버(http://localhost:5173)를 열거나 npm run build를 실행하세요.', content_type='text/plain; charset=utf-8')
