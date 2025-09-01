import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response

# Get an instance of a logger
logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    # First, call DRF's default exception handler to get the standard error response.
    response = exception_handler(exc, context)

    # If the exception is not handled by the default handler (e.g., it's a 500 server error),
    # then response will be None.
    if response is None:
        # Log the full exception traceback for debugging.
        # This is crucial for developers to see what went wrong.
        logger.error(
            f"Unhandled exception: {exc}",
            exc_info=True,
            extra={
                'request': context['request'].__str__(),
            }
        )
        
        # Return a generic, user-friendly error response.
        # This prevents leaking sensitive implementation details to the client.
        return Response(
            {
                "error": "An unexpected server error occurred. Our team has been notified.",
                "code": "INTERNAL_SERVER_ERROR"
            },
            status=500
        )

    # If it's a standard DRF exception, just return the default response.
    # This preserves the default behavior for things like validation errors (400),
    # authentication errors (401/403), and not found errors (404).
    return response