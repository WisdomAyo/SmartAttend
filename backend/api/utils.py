import base64
import os
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status

def handle_base64_image(base64_image, user_id, type):
    if not base64_image:
        return Response({
            "error": "No image data provided.",
            "code": "MISSING_IMAGE"
        }, status=status.HTTP_400_BAD_REQUEST)

    if not os.path.exists(settings.MEDIA_ROOT):
        os.makedirs(settings.MEDIA_ROOT)

    try:
        if ';base64,' in base64_image:
            format, imgstr = base64_image.split(';base64,')
            ext = format.split('/')[-1].split(';')[0]
        else:
            if base64_image.startswith('/9j/'): 
                ext = 'jpg'
            elif base64_image.startswith('iVBORw0KGgo'): 
                ext = 'png'
            else:
                return Response({
                    "error": "Could not determine image format.",
                    "code": "INVALID_FORMAT"
                }, status=status.HTTP_400_BAD_REQUEST)
            imgstr = base64_image

        if ext not in ['jpeg', 'jpg', 'png']:
            return Response({
                "error": "Invalid image format. Only JPEG and PNG are supported.",
                "code": "UNSUPPORTED_FORMAT"
            }, status=status.HTTP_400_BAD_REQUEST)

        imgstr += '=' * (-len(imgstr) % 4)
        image_data = base64.b64decode(imgstr)

        temp_filename = f'temp_{type}_{user_id}_{os.urandom(4).hex()}.{ext}'
        temp_path = os.path.join(settings.MEDIA_ROOT, temp_filename)
        
        with open(temp_path, 'wb') as f:
            f.write(image_data)

        return temp_path, image_data, ext, None

    except Exception as decode_error:
        return None, None, None, Response({
            "error": "Invalid image data. Please check the image format.",
            "code": "DECODE_ERROR"
        }, status=status.HTTP_400_BAD_REQUEST)
