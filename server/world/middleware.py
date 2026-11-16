from django.conf import settings
from django.http import JsonResponse


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get('Origin')
        if origin and origin.rstrip('/') not in settings.ALLOWED_ORIGINS:
            return JsonResponse({'error': '허용되지 않은 요청 출처입니다.'}, status=403)
        response = JsonResponse({}) if request.method == 'OPTIONS' else self.get_response(request)
        if origin:
            response['Access-Control-Allow-Origin'] = origin
            response['Vary'] = 'Origin'
            response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
            response['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response['X-Content-Type-Options'] = 'nosniff'
        response['Referrer-Policy'] = 'same-origin'
        if request.path.startswith('/api/'):
            response['Cache-Control'] = 'no-store'
        return response
