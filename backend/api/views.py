# Updated views.py with enhanced face recognition

import base64
import numpy as np
import cv2
import json
from datetime import datetime
import openpyxl
import os
import traceback
from typing import Dict, List, Optional

# Django and DRF Imports
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.core.files.base import ContentFile
from django.db.models import Count
from django.db.models.functions import TruncDay
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from rest_framework.pagination import PageNumberPagination
import logging

# Set up logging
logger = logging.getLogger(__name__)

User = get_user_model()

# Djoser Imports
from djoser.views import UserViewSet as DjoserUserViewSet

# Local Models
from .models import Course, Student, AttendanceRecord

# Serializer Imports
from .serializers import (
    CourseSerializer,
    StudentSerializer,
    DashboardCourseSerializer,
    DashboardRecentAttendanceSerializer,
    UserSerializer,
    NestedStudentSerializer,
    CourseDetailSerializer,
)
# Enhanced Face Recognition Service
from backend.api.services import face_recognition_service


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000

class UserViewSet(DjoserUserViewSet):
    """
    Custom User ViewSet with enhanced photo upload and validation
    """
    serializer_class = UserSerializer

    @action(detail=False, methods=['post'], url_path='me/upload_photo', permission_classes=[IsAuthenticated])
    def upload_photo(self, request, *args, **kwargs):
        """
        Enhanced profile picture upload with face validation
        """
        try:
            user = request.user
            base64_image = request.data.get('image')

            if not base64_image:
                return Response({
                    "error": "No image data provided.",
                    "code": "MISSING_IMAGE"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Ensure MEDIA_ROOT directory exists
            if not os.path.exists(settings.MEDIA_ROOT):
                os.makedirs(settings.MEDIA_ROOT)

            # Decode and validate image
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

                # Save temporary image for validation
                temp_filename = f'temp_user_{user.id}_{os.urandom(4).hex()}.{ext}'
                temp_path = os.path.join(settings.MEDIA_ROOT, temp_filename)
                
                with open(temp_path, 'wb') as f:
                    f.write(image_data)

                # Validate face in image
                validation_result = face_recognition_service.validate_face_image(temp_path)
                
                if not validation_result['valid']:
                    os.remove(temp_path)  # Cleanup
                    return Response({
                        "error": f"No clear face detected in image: {validation_result.get('error', 'Unknown error')}",
                        "code": "NO_FACE_DETECTED",
                        "suggestion": "Please upload a clear photo with your face visible"
                    }, status=status.HTTP_400_BAD_REQUEST)

                # If validation passed, save the image
                image_filename = f'user_{user.id}_{os.urandom(4).hex()}.{ext}'
                file_content = ContentFile(image_data)

                # Remove old picture
                if user.profile_picture:
                    old_path = user.profile_picture.path
                    if os.path.exists(old_path):
                        try:
                            os.remove(old_path)
                            logger.info(f"Removed old photo: {old_path}")
                        except OSError as e:
                            logger.warning(f"Error removing old photo {old_path}: {e}")

                # Save the new file
                user.profile_picture.save(image_filename, file_content, save=True)
                
                # Cleanup temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                
                logger.info(f"Successfully uploaded profile picture for user {user.id}")

                # Return updated user data
                serializer = self.get_serializer(user)
                return Response({
                    "message": "Profile picture uploaded successfully",
                    "user": serializer.data,
                    "face_validation": validation_result
                }, status=status.HTTP_200_OK)

            except Exception as decode_error:
                logger.error(f"Error processing image for user {user.id}: {decode_error}")
                return Response({
                    "error": "Invalid image data. Please check the image format.",
                    "code": "DECODE_ERROR"
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Unexpected error during profile picture upload: {e}")
            logger.error(traceback.format_exc())
            return Response({
                "error": "An unexpected error occurred during photo upload.",
                "code": "INTERNAL_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardDataView(APIView):
    """
    API view to fetch data for the dashboard with proper error handling.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            teacher = request.user

            # Get total counts with error handling
            try:
                course_count = Course.objects.filter(teacher=teacher).count()
                student_count = Student.objects.filter(courses__teacher=teacher).distinct().count()
            except Exception as e:
                logger.error(f"Error getting counts for teacher {teacher.id}: {e}")
                course_count = 0
                student_count = 0

            # Get recent courses
            try:
                recent_courses = Course.objects.filter(teacher=teacher).order_by('-id')[:4]
                recent_courses_serializer = DashboardCourseSerializer(recent_courses, many=True)
            except Exception as e:
                logger.error(f"Error getting recent courses for teacher {teacher.id}: {e}")
                recent_courses_serializer = DashboardCourseSerializer([], many=True)

            # Get recent attendance
            try:
                recent_attendance = AttendanceRecord.objects.filter(
                    course__teacher=teacher
                ).select_related('student', 'course').order_by('-timestamp')[:5]
                recent_attendance_serializer = DashboardRecentAttendanceSerializer(recent_attendance, many=True)
            except Exception as e:
                logger.error(f"Error getting recent attendance for teacher {teacher.id}: {e}")
                recent_attendance_serializer = DashboardRecentAttendanceSerializer([], many=True)

            # Get attendance chart data
            try:
                seven_days_ago = timezone.now() - timezone.timedelta(days=7)
                attendance_by_day = (
                    AttendanceRecord.objects.filter(
                        course__teacher=teacher, 
                        timestamp__gte=seven_days_ago
                    )
                    .annotate(day=TruncDay('timestamp'))
                    .values('day')
                    .annotate(count=Count('id'))
                    .order_by('day')
                )

                chart_data = {
                    "labels": [entry['day'].strftime('%b %d') for entry in attendance_by_day],
                    "data": [entry['count'] for entry in attendance_by_day]
                }
            except Exception as e:
                logger.error(f"Error getting chart data for teacher {teacher.id}: {e}")
                chart_data = {"labels": [], "data": []}

            # Compile response
            data = {
                'stats': {
                    'course_count': course_count,
                    'student_count': student_count,
                },
                'recent_courses': recent_courses_serializer.data,
                'recent_attendance': recent_attendance_serializer.data,
                'attendance_chart': chart_data
            }

            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Unexpected error in dashboard data view: {e}")
            logger.error(traceback.format_exc())
            return Response({
                "error": "Failed to load dashboard data",
                "code": "DASHBOARD_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CourseViewSet(viewsets.ModelViewSet):
    """
    Enhanced CourseViewSet with improved face recognition integration
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Returns the appropriate serializer class based on the action."""
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseSerializer

    def get_queryset(self):
        """Filters queryset to user's courses with error handling."""
        try:
            user_courses_qs = self.request.user.courses.all()
            if self.action == 'retrieve':
                user_courses_qs = user_courses_qs.prefetch_related('students')
            return user_courses_qs
        except Exception as e:
            logger.error(f"Error getting course queryset for user {self.request.user.id}: {e}")
            return Course.objects.none()

    def list(self, request, *args, **kwargs):
        """Override list method to add error handling"""
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error in CourseViewSet.list: {e}")
            return Response(
                {"error": "Failed to retrieve courses"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_create(self, serializer):
        """Assigns the currently logged-in user as the teacher."""
        try:
            logger.info(f"Creating course for user: {self.request.user}")
            serializer.save(teacher=self.request.user)
        except Exception as e:
            logger.error(f"Error creating course for user {self.request.user.id}: {e}")
            raise

    @action(detail=True, methods=['post'], url_path='enroll-student')
    def enroll_student(self, request, pk=None):
        """Enroll an existing student in a specific course."""
        try:
            course = self.get_object()

            # Permission check
            if course.teacher != request.user:
                return Response({
                    "error": "You do not have permission to modify this course.",
                    "code": "PERMISSION_DENIED"
                }, status=status.HTTP_403_FORBIDDEN)

            student_pk_to_enroll = request.data.get('student_pk')

            if student_pk_to_enroll is None or student_pk_to_enroll == '':
                return Response({
                    "error": "'student_pk' (Student Primary Key) is required in the request body.",
                    "code": "MISSING_STUDENT_PK"
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                student_pk_integer = int(student_pk_to_enroll)
                student = Student.objects.get(pk=student_pk_integer)

                # Check if already enrolled
                if course.students.filter(pk=student.pk).exists():
                    return Response({
                        'message': f'Student {student.first_name} {student.last_name} ({student.student_id}) is already enrolled in course {course.course_code}.',
                        'code': 'ALREADY_ENROLLED'
                    }, status=status.HTTP_200_OK)

                # Enroll student
                course.students.add(student)
                logger.info(f"Student {student.pk} enrolled in course {course.pk}")

                return Response({
                    'message': f'Student {student.first_name} {student.last_name} ({student.student_id}) enrolled successfully in course {course.course_code}.',
                    'code': 'ENROLLMENT_SUCCESS'
                }, status=status.HTTP_200_OK)

            except (ValueError, TypeError):
                return Response({
                    "error": "'student_pk' must be a valid integer ID.",
                    "code": "INVALID_STUDENT_PK"
                }, status=status.HTTP_400_BAD_REQUEST)

            except Student.DoesNotExist:
                return Response({
                    'error': f'Student with PK {student_pk_to_enroll} not found.',
                    'code': 'STUDENT_NOT_FOUND'
                }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Error enrolling student {student_pk_to_enroll} in course {pk}: {e}")
            logger.error(traceback.format_exc())
            return Response({
                "error": "An unexpected error occurred during enrollment.",
                "code": "ENROLLMENT_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='remove-student')
    def remove_student(self, request, pk=None):
        """Remove a student from a specific course."""
        try:
            course = self.get_object()

            if course.teacher != request.user:
                return Response({
                    "error": "You do not have permission to modify this course.",
                    "code": "PERMISSION_DENIED"
                }, status=status.HTTP_403_FORBIDDEN)

            student_pk_to_remove = request.data.get('student_pk')

            if student_pk_to_remove is None or student_pk_to_remove == '':
                return Response({
                    "error": "'student_pk' (Student Primary Key) is required in the request body.",
                    "code": "MISSING_STUDENT_PK"
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                student_pk_integer = int(student_pk_to_remove)
                student = Student.objects.get(pk=student_pk_integer)

                # Check if student is enrolled
                if not course.students.filter(pk=student.pk).exists():
                    return Response({
                        'error': f'Student {student.first_name} {student.last_name} ({student.student_id}) is not enrolled in course {course.course_code}.',
                        'code': 'STUDENT_NOT_ENROLLED'
                    }, status=status.HTTP_404_NOT_FOUND)

                # Remove student
                course.students.remove(student)
                logger.info(f"Student {student.pk} removed from course {course.pk}")

                return Response({
                    'message': f'Student {student.first_name} {student.last_name} ({student.student_id}) removed successfully from course {course.course_code}.',
                    'code': 'REMOVAL_SUCCESS'
                }, status=status.HTTP_200_OK)

            except (ValueError, TypeError):
                return Response({
                    "error": "'student_pk' must be a valid integer ID.",
                    "code": "INVALID_STUDENT_PK"
                }, status=status.HTTP_400_BAD_REQUEST)

            except Student.DoesNotExist:
                return Response({
                    'error': f'Student with PK {student_pk_to_remove} not found.',
                    'code': 'STUDENT_NOT_FOUND'
                }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Error removing student {student_pk_to_remove} from course {pk}: {e}")
            logger.error(traceback.format_exc())
            return Response({
                "error": "An unexpected error occurred during removal.",
                "code": "REMOVAL_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='mark_attendance')
    def mark_attendance(self, request, pk=None):
        """
        Enhanced attendance marking using the new face recognition service
        """
        try:
            course = self.get_object()

            if course.teacher != request.user:
                return Response({
                    "error": "You do not have permission to mark attendance for this course.",
                    "code": "PERMISSION_DENIED"
                }, status=status.HTTP_403_FORBIDDEN)

            base64_image = request.data.get('image')
            if not base64_image:
                return Response({
                    "error": "No image data provided.",
                    "code": "MISSING_IMAGE"
                }, status=status.HTTP_400_BAD_REQUEST)

            temp_image_path = None
            present_students_data = []
            recognized_student_ids = set()

            try:
                if not os.path.exists(settings.MEDIA_ROOT):
                    os.makedirs(settings.MEDIA_ROOT)

                # Decode and save image
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

                temp_filename = f"attendance_{os.urandom(8).hex()}.{ext}"
                temp_image_path = os.path.join(settings.MEDIA_ROOT, temp_filename)

                with open(temp_image_path, 'wb') as f:
                    f.write(image_data)

                logger.info(f"Saved attendance image: {temp_image_path}")

                # Prepare student data for face database
                enrolled_students = course.students.all()
                if not enrolled_students.exists():
                    return Response({
                        "error": "No students enrolled in this course.",
                        "code": "NO_STUDENTS"
                    }, status=status.HTTP_400_BAD_REQUEST)

                students_data = []
                students_with_photos = 0
                
                for student in enrolled_students:
                    if student.profile_photo and os.path.exists(student.profile_photo.path):
                        students_data.append({
                            'id': student.id,
                            'profile_photo_path': student.profile_photo.path,
                            'name': f"{student.first_name} {student.last_name}".strip()
                        })
                        students_with_photos += 1

                if not students_data:
                    return Response({
                        "error": "No students in this course have face encodings. Please upload student photos.",
                        "code": "NO_FACE_DATA"
                    }, status=status.HTTP_400_BAD_REQUEST)

                logger.info(f"Prepared face database with {students_with_photos} student faces")

                # Prepare face database using enhanced service
                known_faces_db = face_recognition_service.prepare_student_face_database(students_data)

                if not known_faces_db:
                    return Response({
                        "error": "Failed to prepare face database.",
                        "code": "DATABASE_ERROR"
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                # Find faces in the classroom image using enhanced service
                face_matches = face_recognition_service.find_faces_in_image_enhanced(temp_image_path, known_faces_db)
                
                # Mark attendance
                today = timezone.now().date()
                
                for match in face_matches:
                    if match.confidence >= 0.7:  # High confidence threshold
                        try:
                            student = Student.objects.get(id=match.student_id)
                            
                            # Create or update attendance record
                            record, created = AttendanceRecord.objects.get_or_create(
                                student=student,
                                course=course,
                                timestamp__date=today,
                                defaults={
                                    'timestamp': timezone.now(), 
                                    'is_present': True
                                }
                            )

                            if created:
                                recognized_student_ids.add(match.student_id)
                                present_students_data.append(StudentSerializer(student).data)
                                logger.info(f"Marked present: {student.first_name} {student.last_name} (confidence: {match.confidence:.2f})")

                        except Student.DoesNotExist:
                            logger.warning(f"Student with ID {match.student_id} not found")
                            continue

                return Response({
                    "status": "Attendance marked successfully",
                    "present_students": present_students_data,
                    "recognized_faces_count": len(recognized_student_ids),
                    "total_faces_detected": len(face_matches),
                    "students_with_photos": students_with_photos,
                    "face_matches": [
                        {
                            "student_id": match.student_id,
                            "confidence": match.confidence,
                            "bbox": match.bbox
                        } for match in face_matches
                    ]
                }, status=status.HTTP_200_OK)

            except Exception as processing_error:
                logger.error(f"Error processing attendance image: {processing_error}")
                logger.error(traceback.format_exc())
                return Response({
                    "error": f"Error processing image: {str(processing_error)}",
                    "code": "PROCESSING_ERROR"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            finally:
                # Cleanup temporary files
                if temp_image_path and os.path.exists(temp_image_path):
                    try:
                        os.remove(temp_image_path)
                        logger.info(f"Cleaned up temp image: {temp_image_path}")
                    except OSError as e:
                        logger.warning(f"Error removing temp image {temp_image_path}: {e}")

        except Exception as e:
            logger.error(f"Unexpected error in mark_attendance: {e}")
            logger.error(traceback.format_exc())
            return Response({
                "error": "An unexpected error occurred during attendance marking.",
                "code": "ATTENDANCE_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='attendance-report')
    def attendance_report(self, request, pk=None):
        """Generate Excel attendance report with error handling."""
        try:
            course = self.get_object()

            if course.teacher != request.user:
                return Response({
                    "error": "You do not have permission to access reports for this course.",
                    "code": "PERMISSION_DENIED"
                }, status=status.HTTP_403_FORBIDDEN)

            date_str = request.query_params.get('date')
            if not date_str:
                return Response({
                    'error': 'Date parameter is required.',
                    'code': 'MISSING_DATE'
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                report_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({
                    'error': 'Invalid date format. Use YYYY-MM-DD.',
                    'code': 'INVALID_DATE'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get attendance records
            records = AttendanceRecord.objects.filter(
                course=course, 
                timestamp__date=report_date
            ).select_related('student').order_by('student__student_id')

            present_student_ids = set(records.values_list('student__student_id', flat=True))
            all_students = course.students.all().order_by('student_id')

            # Create Excel workbook
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = f"Attendance {report_date}"

            # Headers
            headers = ["Student ID", "First Name", "Last Name", "Email", "Level", "Status", "Timestamp"]
            ws.append(headers)

            # Data rows
            for student in all_students:
                status_text = "Present" if student.student_id in present_student_ids else "Absent"
                attendance_timestamp = ''
                
                if status_text == "Present":
                    record = next((rec for rec in records if rec.student_id == student.id), None)
                    if record:
                        attendance_timestamp = record.timestamp.strftime('%Y-%m-%d %H:%M:%S')

                ws.append([
                    student.student_id or '',
                    student.first_name or '',
                    student.last_name or '',
                    student.email or '',
                    student.level or '',
                    status_text,
                    attendance_timestamp
                ])

            # Create response
            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            response['Content-Disposition'] = f'attachment; filename="attendance_{course.course_code}_{report_date}.xlsx"'

            wb.save(response)
            logger.info(f"Generated attendance report for course {course.id}, date {report_date}")
            return response

        except Exception as e:
            logger.error(f"Error generating attendance report: {e}")
            logger.error(traceback.format_exc())
            return Response({
                "error": "Failed to generate attendance report.",
                "code": "REPORT_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StudentViewSet(viewsets.ModelViewSet):
    """
    Enhanced StudentViewSet with face validation
    """
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filters students to user's created students."""
        try:
            return Student.objects.filter(created_by=self.request.user).distinct()
        except Exception as e:
            logger.error(f"Error getting student queryset for user {self.request.user.id}: {e}")
            return Student.objects.none()

    def list(self, request, *args, **kwargs):
        """Override list method to add error handling"""
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error in StudentViewSet.list: {e}")
            return Response(
                {"error": "Failed to retrieve students"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_create(self, serializer):
        try:
            serializer.save(created_by=self.request.user)
        except Exception as e:
            logger.error(f"Error creating student: {e}")
            raise
            
    @action(detail=True, methods=['post'], url_path='enroll-face')
    def enroll_face(self, request, pk=None):
        """Enhanced face enrollment with validation"""
        try:
            student = self.get_object()

            if student.created_by != request.user:
                return Response({
                    "error": "You can only upload images for students you created.",
                    "code": "PERMISSION_DENIED"
                }, status=status.HTTP_403_FORBIDDEN)

            base64_image = request.data.get('image')
            if not base64_image:
                return Response({
                    "error": "No image data provided.",
                    "code": "MISSING_IMAGE"
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                if not os.path.exists(settings.MEDIA_ROOT):
                    os.makedirs(settings.MEDIA_ROOT)

                # Decode image
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

                # Save temporary image for validation
                temp_filename = f'temp_student_{student.id}_{os.urandom(4).hex()}.{ext}'
                temp_path = os.path.join(settings.MEDIA_ROOT, temp_filename)
                
                with open(temp_path, 'wb') as f:
                    f.write(image_data)

                # Validate face in image
                validation_result = face_recognition_service.validate_face_image(temp_path)
                
                if not validation_result['valid']:
                    os.remove(temp_path)  # Cleanup
                    return Response({
                        "error": f"No clear face detected in image: {validation_result.get('error', 'Unknown error')}",
                        "code": "NO_FACE_DETECTED",
                        "suggestion": "Please upload a clear photo with the student's face visible"
                    }, status=status.HTTP_400_BAD_REQUEST)

                # If validation passed, save the image
                image_filename = f'student_{student.id}_{os.urandom(4).hex()}.{ext}'
                file_content = ContentFile(image_data)

                # Remove old picture
                if student.profile_photo:
                    old_path = student.profile_photo.path
                    if os.path.exists(old_path):
                        try:
                            os.remove(old_path)
                            logger.info(f"Removed old photo: {old_path}")
                        except OSError as e:
                            logger.warning(f"Error removing old photo {old_path}: {e}")

                # Save the new file
                student.profile_photo.save(image_filename, file_content, save=True)
                
                # Cleanup temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                
                logger.info(f"Successfully uploaded profile picture for student {student.id}")

                # Return updated student data
                serializer = self.get_serializer(student)
                return Response({
                    "message": "Student face enrolled successfully",
                    "student": serializer.data,
                    "face_validation": validation_result
                }, status=status.HTTP_200_OK)

            except Exception as decode_error:
                logger.error(f"Error processing image for student {student.id}: {decode_error}")
                return Response({
                    "error": "Invalid image data. Please check the image format.",
                    "code": "DECODE_ERROR"
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Unexpected error during student face enrollment: {e}")
            logger.error(traceback.format_exc())
            return Response({
                "error": "An unexpected error occurred during face enrollment.",
                "code": "INTERNAL_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FaceRecognitionDebugView(APIView):
    """
    Debug view for face recognition testing
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            base64_image = request.data.get('image')
            if not base64_image:
                return Response({
                    "error": "No image data provided.",
                    "code": "MISSING_IMAGE"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Decode and save image
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

            temp_filename = f"debug_{os.urandom(8).hex()}.{ext}"
            temp_image_path = os.path.join(settings.MEDIA_ROOT, temp_filename)

            with open(temp_image_path, 'wb') as f:
                f.write(image_data)

            try:
                # Validate face in image
                validation_result = face_recognition_service.validate_face_image(temp_image_path)
                
                return Response({
                    "face_validation": validation_result,
                    "image_path": temp_image_path
                }, status=status.HTTP_200_OK)

            finally:
                # Cleanup temporary files
                if os.path.exists(temp_image_path):
                    try:
                        os.remove(temp_image_path)
                    except OSError as e:
                        logger.warning(f"Error removing temp image {temp_image_path}: {e}")

        except Exception as e:
            logger.error(f"Error in face recognition debug view: {e}")
            logger.error(traceback.format_exc())
            return Response({
                "error": "An unexpected error occurred during face validation.",
                "code": "INTERNAL_ERROR"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)