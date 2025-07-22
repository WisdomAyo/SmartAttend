# facials/backend/api/middleware.py

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model

User = get_user_model()

@database_sync_to_async
def get_user(token_key):
    try:
        # Validate the token
        token = AccessToken(token_key)
        # Get the user ID from the token
        user_id = token.payload['user_id']
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist):
        # Token is invalid or user doesn't exist
        return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    """
    Custom middleware that takes a token from the query string and
    authenticates the user.
    """
    async def __call__(self, scope, receive, send):
        # Get the token from the query string
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if token:
            # If a token is present, try to get the user
            scope['user'] = await get_user(token)
        else:
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)