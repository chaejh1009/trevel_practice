#!/bin/sh
set -eu
python server/manage.py migrate --noinput
cd server
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
