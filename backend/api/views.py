import base64
import numpy as np
import cv2
import json
from datetime import datetime
import openpyxl
import os
import shutil# Used for temporary folders

# --- Django and DRF Imports ---
from django.conf import settings
from django.http import HttpResponse
from django.core.files.base import ContentFile
from django.db.models import Count
from django.db.models.functions import TruncDay
from django.utils import timezone
from django.shortcuts import get_object_or_404 # Helpful for retrieving objects
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.contrib.auth import get_user_model # Use get_user_model for User reference

User = get_user_model() # Get the active user model


# --- Djoser Imports (Needed if inheriting) ---
# If you are using Djoser's default UserViewSet and overriding it
from djoser.views import UserViewSet as DjoserUserViewSet


# --- Local Models ---
# Import your models
from .models import Course, Student, AttendanceRecord # Assuming User is your custom user model

# --- Serializer Imports ---
# Import all necessary serializers from your serializers.py
from .serializers import (
    CourseSerializer,
    StudentSerializer,
    DashboardCourseSerializer,
    DashboardRecentAttendanceSerializer,
    UserSerializer,
    NestedStudentSerializer, # Might not need here if only used in serializers.py
    # *** IMPORT THE SERIALIZER CLASS DEFINED IN serializers.py ***
    CourseDetailSerializer,
)

# -------------------------------------------------------------------
# VIEWS
# -------------------------------------------------------------------

# If you are using Djoser's default UserViewSet and want to add actions to it
class UserViewSet(DjoserUserViewSet):
    """
    Custom User ViewSet inheriting from Djoser to add custom actions.
    The 'me' endpoint is handled by Djoser's base class.
    """
    # Set the serializer to use for the 'me' endpoint and list views
    serializer_class = UserSerializer

    # Djoser's base ViewSet already provides default actions.

    # *** ADD THIS ACTION FOR PROFILE PHOTO UPLOAD ***
    # This action will be available at the detail route (which is '/me/' for the authenticated user)
    # So the URL will be like /users/me/upload_photo/ if using Djoser's router correctly
    @action(detail=False, methods=['post'], url_path='me/upload_photo', permission_classes=[IsAuthenticated])
    def upload_photo(self, request, *args, **kwargs):
        """
        Uploads a profile picture for the currently authenticated user.
        Accessible via /auth/users/me/upload_photo/ (if Djoser configured correctly).
        Expects 'image' (base64 string) in the request body.
        """
        # detail=True on /me/ should make self.get_object() return the current user
        user = self.get_object()
        user = request.user

        # Double check the user to be safe
        if user != request.user:
             return Response({"detail": "You do not have permission to upload photo for this user."}, status=status.HTTP_403_FORBIDDEN)

        base64_image = request.data.get('image')

        if not base64_image:
            return Response({"error": "No image data provided."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Ensure MEDIA_ROOT directory exists
            if not os.path.exists(settings.MEDIA_ROOT):
                os.makedirs(settings.MEDIA_ROOT)

            # Decode base64 image data
            if ';base64,' in base64_image:
                format, imgstr = base64_image.split(';base64,')
                ext = format.split('/')[-1].split(';')[0] # Get file extension (jpeg, png)
            else:
                 # Basic format detection if prefix is missing
                 if base64_image.startswith('/9j/'): ext = 'jpg'
                 elif base64_image.startswith('iVBORw0KGgo'): ext = 'png'
                 else:
                     return Response({"error": "Could not determine image format. Ensure base64 string is correct."}, status=status.HTTP_400_BAD_REQUEST)
                 imgstr = base64_image


            if ext not in ['jpeg', 'jpg', 'png']:
                 return Response({"error": "Invalid image format. Only JPEG and PNG are supported."}, status=status.HTTP_400_BAD_REQUEST)

            # Handle potential padding characters in base64 string
            imgstr += '=' * (-len(imgstr) % 4)
            image_data = base64.b64decode(imgstr)


            # Generate a unique filename using user ID and a random hex string
            image_filename = f'user_{user.id}_{os.urandom(4).hex()}.{ext}'

            # Create a Django ContentFile from the decoded data
            file_content = ContentFile(image_data)

             # Remove old picture before saving new one if it exists
            if user.profile_picture:
                 old_path = user.profile_picture.path
                 if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                        print(f"Removed old photo: {old_path}")
                    except OSError as e:
                        print(f"Error removing old photo {old_path}: {e}")


            # Save the file to the user's profile_picture field
            user.profile_picture.save(image_filename, file_content, save=True)

            # Return the updated user data using the serializer
            serializer = self.get_serializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK) # Use 200 OK for update/save

        except Exception as e:
            # Catch any errors during decoding, file saving, etc.
            print(f"Error during profile picture upload for user {user.id}: {e}")
            return Response({"error": f"An error occurred during photo upload: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardDataView(APIView):
    """
    API view to fetch data for the dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        teacher = self.request.user

        # 1. Get total counts
        course_count = Course.objects.filter(teacher=teacher).count()
        # Use distinct() to count students only once even if enrolled in multiple courses
        student_count = Student.objects.filter(courses__teacher=teacher).distinct().count()

        # 2. Get the 4 most recent courses (adapt limit as needed for display)
        recent_courses = Course.objects.filter(teacher=teacher).order_by('-id')[:4]

        # 3. Get the 5 most recent attendance records (adapt limit as needed for display)
        recent_attendance = AttendanceRecord.objects.filter(course__teacher=teacher).order_by('-timestamp')[:5]

        # 4. Data for an attendance-by-day chart (last 7 days)
        seven_days_ago = timezone.now() - timezone.timedelta(days=7)
        # Aggregate attendance records by day for the logged-in teacher's courses
        attendance_by_day = (
            AttendanceRecord.objects.filter(course__teacher=teacher, timestamp__gte=seven_days_ago)
            .annotate(day=TruncDay('timestamp')) # Group by day
            .values('day') # Select the day field
            .annotate(count=Count('id')) # Count records per day
            .order_by('day') # Order chronologically
        )

        # Prepare chart data format (labels and data arrays)
        chart_data = {
            "labels": [entry['day'].strftime('%b %d') for entry in attendance_by_day], # Format date nicely (e.g., "Jun 25")
            "data": [entry['count'] for entry in attendance_by_day]
        }

        # 5. Serialize the data using appropriate serializers
        recent_courses_serializer = DashboardCourseSerializer(recent_courses, many=True)
        recent_attendance_serializer = DashboardRecentAttendanceSerializer(recent_attendance, many=True)

        # 6. Compile the final response payload
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


class CourseViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for viewing and editing courses, including attendance actions.
    Teacher can only manage their own courses.
    """
    queryset = Course.objects.all()
    permission_classes = [IsAuthenticated]

    # *** CORRECT get_serializer_class METHOD - RETURN CLASS REFERENCE ***
    def get_serializer_class(self):
        """
        Returns the appropriate serializer class based on the action.
        """
        if self.action == 'retrieve':
            # Return the CourseDetailSerializer CLASS defined in serializers.py
            return CourseDetailSerializer
        # Return the basic CourseSerializer CLASS defined in serializers.py for other actions
        return CourseSerializer


    def get_queryset(self):
        """
        Filters the queryset to only return courses associated with the currently logged-in user.
        Prefetch students for the detail view to optimize performance.
        """
        user_courses_qs = self.request.user.courses.all()
        # Only prefetch students for the 'retrieve' action (single course detail)
        if self.action == 'retrieve':
             user_courses_qs = user_courses_qs.prefetch_related('students')
        return user_courses_qs


    def perform_create(self, serializer):
        """
        Assigns the currently logged-in user as the teacher for a new course.
        """
        print("🔍 perform_create triggered with user:", self.request.user) # Keep for debugging
        serializer.save(teacher=self.request.user) # Set the teacher to the current user

    @action(detail=True, methods=['post'], url_path='enroll-student')
    def enroll_student(self, request, pk=None):
        """
        Action to enroll an existing student in a specific course.
        Accessible via /api/courses/{course_id}/enroll-student/
        Expects 'student_pk' (the integer database ID) in the request body.
        """
        course = self.get_object() # Get the Course instance based on the URL pk

        # Ensure the course belongs to the logged-in teacher before proceeding
        if course.teacher != request.user:
             return Response({"error": "You do not have permission to modify this course."}, status=status.HTTP_403_FORBIDDEN)


        # Extract the student primary key (integer ID) from the request body
        student_pk_to_enroll = request.data.get('student_pk')

        # Basic validation
        if student_pk_to_enroll is None or student_pk_to_enroll == '': # Explicitly check for None and empty string
             print("DEBUG: Enrollment Validation Failed: 'student_pk' is missing or empty.")
             return Response({"error": "'student_pk' (Student Primary Key) is required in the request body."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Attempt to convert the received value to an integer
            # Adding int() conversion can help if frontend sends as string "7"
            student_pk_integer = int(student_pk_to_enroll)
            print(f"DEBUG: Attempting to enroll student with PK: {student_pk_integer}")


            # Find the Student instance using their primary key (pk)
            student = Student.objects.get(pk=student_pk_integer)

            # Ensure student is not already enrolled
            # Check if the ManyToMany relationship already exists
            if course.students.filter(pk=student.pk).exists():
                 print(f"DEBUG: Student {student.pk} already enrolled in course {course.pk}")
                 # Return 200 OK with an informative message if already enrolled
                 return Response({'status': f'Student {student.first_name} {student.last_name} ({student.student_id}) is already enrolled in course {course.course_code}.'}, status=status.HTTP_200_OK)


            # Add the found student to the many-to-many relationship with the course
            # Django's add() method will handle the insertion into the intermediate table
            course.students.add(student)
            print(f"DEBUG: Student {student.pk} successfully enrolled in course {course.pk}")


            # Return a success response (200 OK is fine, or 201 Created could also be used)
            return Response({'status': f'Student {student.first_name} {student.last_name} ({student.student_id}) enrolled successfully in course {course.course_code}.'}, status=status.HTTP_200_OK)

        except (ValueError, TypeError) as e:
             # Handle cases where student_pk_to_enroll cannot be converted to an integer
             print(f"DEBUG: Enrollment Error: int() conversion failed for '{student_pk_to_enroll}' (type: {type(student_pk_to_enroll)}). Exception: {e}")
             return Response({"error": "'student_pk' must be a valid integer ID."}, status=status.HTTP_400_BAD_REQUEST)

        except Student.DoesNotExist:
             # Handle the case where a student with the provided pk does not exist
            print(f"DEBUG: Enrollment Error: Student with PK {student_pk_to_enroll} not found.")
            return Response({'error': f'Student with PK {student_pk_to_enroll} not found.'}, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            # Catch any other unexpected errors
            print(f"Error enrolling student {student_pk_to_enroll} in course {course.id}: {e}")
            return Response({"error": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    @action(detail=True, methods=['post'], url_path='remove-student')
    def remove_student(self, request, pk=None):
        """
        Action to remove an existing student from a specific course.
        Accessible via /api/courses/{course_id}/remove-student/
        Expects 'student_pk' (the integer database ID) in the request body.
        """
        course = self.get_object() # Get the Course instance based on the URL pk

        # Ensure the course belongs to the logged-in teacher before proceeding
        if course.teacher != request.user:
             return Response({"error": "You do not have permission to modify this course."}, status=status.HTTP_403_FORBIDDEN)


        # Extract the student primary key (integer ID) from the request body
        student_pk_to_remove = request.data.get('student_pk')

        # Basic validation
        if student_pk_to_remove is None or student_pk_to_remove == '':
             print("DEBUG: Removal Validation Failed: 'student_pk' is missing or empty.")
             return Response({"error": "'student_pk' (Student Primary Key) is required in the request body."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Attempt to convert to integer and find the student
            student_pk_integer = int(student_pk_to_remove)
            print(f"DEBUG: Attempting to remove student with PK: {student_pk_integer}")

            student = Student.objects.get(pk=student_pk_integer)

            # Check if the student is actually enrolled in this course
            if not course.students.filter(pk=student.pk).exists():
                 print(f"DEBUG: Removal Error: Student {student.pk} not found in course {course.pk}")
                 # Return 404 if student is not found *in this course*
                 return Response({'error': f'Student {student.first_name} {student.last_name} ({student.student_id}) is not enrolled in course {course.course_code}.'}, status=status.HTTP_404_NOT_FOUND)


            # Remove the student from the many-to-many relationship
            # Django's remove() method handles the deletion from the intermediate table
            course.students.remove(student)
            print(f"DEBUG: Student {student.pk} successfully removed from course {course.pk}")


            # Return a success response (200 OK or 204 No Content)
            return Response({'status': f'Student {student.first_name} {student.last_name} ({student.student_id}) removed successfully from course {course.course_code}.'}, status=status.HTTP_200_OK)

        except (ValueError, TypeError) as e:
             print(f"DEBUG: Removal Error: int() conversion failed for '{student_pk_to_remove}' (type: {type(student_pk_to_remove)}). Exception: {e}")
             return Response({"error": "'student_pk' must be a valid integer ID."}, status=status.HTTP_400_BAD_REQUEST)

        except Student.DoesNotExist:
             # Handle the case where a student with the provided pk does not exist globally
             print(f"DEBUG: Removal Error: Student with PK {student_pk_to_remove} not found globally.")
             return Response({'error': f'Student with PK {student_pk_to_remove} not found.'}, status=status.HTTP_404_NOT_FOUND)


        except Exception as e:
            # Catch any other unexpected errors
            print(f"Error removing student {student_pk_to_remove} from course {course.id}: {e}")
            return Response({"error": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    @action(detail=True, methods=['post'], url_path='mark_attendance')
    def mark_attendance(self, request, pk=None):
        """
        Mark attendance for students in the course using a class photo via DeepFace.
        Accessible via /api/courses/{course_id}/mark_attendance/
        Expects 'image' (base64 string) in the request body.
        """
        course = self.get_object()

        if course.teacher != request.user:
             return Response({"error": "You do not have permission to mark attendance for this course."}, status=status.HTTP_403_FORBIDDEN)

        base64_image = request.data.get('image')
        if not base64_image:
            return Response({"error": "No image data provided."}, status=status.HTTP_400_BAD_REQUEST)

        temp_image_path = None
        db_path = None
        present_students_data = []
        recognized_student_ids = set()
        total_faces_detected_in_photo = 0

        try:
            if not os.path.exists(settings.MEDIA_ROOT):
                os.makedirs(settings.MEDIA_ROOT)

            # Decode base64 image data
            if ';base64,' in base64_image:
                format, imgstr = base64_image.split(';base64,')
                ext = format.split('/')[-1].split(';')[0]
            else:
                 if base64_image.startswith('/9j/'): ext = 'jpg'
                 elif base64_image.startswith('iVBORw0KGgo'): ext = 'png'
                 else:
                     return Response({"error": "Could not determine image format. Ensure base64 string is correct."}, status=status.HTTP_400_BAD_REQUEST)
                 imgstr = base64_image

            if ext not in ['jpeg', 'jpg', 'png']:
                 return Response({"error": "Invalid image format. Only JPEG and PNG are supported."}, status=status.HTTP_400_BAD_REQUEST)

            imgstr += '=' * (-len(imgstr) % 4) # Add padding
            image_data = base64.b64decode(imgstr)

            temp_filename = f"upload_{os.urandom(8).hex()}.{ext}"
            temp_image_path = os.path.join(settings.MEDIA_ROOT, temp_filename)

            with open(temp_image_path, 'wb') as f:
                f.write(image_data)
            print(f"Saved temporary image: {temp_image_path}")


            # Prepare the database of known faces for DeepFace
            temp_db_hash = os.urandom(4).hex()
            db_path = os.path.join(settings.MEDIA_ROOT, f'deepface_temp_db_{temp_db_hash}')
            os.makedirs(db_path)
            print(f"Created temporary DeepFace DB directory: {db_path}")

            student_map = {}
            enrolled_students = course.students.all()

            if not enrolled_students.exists():
                 return Response({"error": "No students enrolled in this course."}, status=status.HTTP_400_BAD_REQUEST)

            students_with_photos_count = 0
            for student in enrolled_students:
                if student.profile_photo and os.path.exists(student.profile_photo.path):
                    students_with_photos_count += 1
                    identity_folder = os.path.join(db_path, f"identity_{student.id}") # Using identity_ prefix
                    os.makedirs(identity_folder, exist_ok=True)
                    destination_path = os.path.join(identity_folder, 'face.jpg')
                    shutil.copy(student.profile_photo.path, destination_path)
                    student_map[f"identity_{student.id}"] = student # Map key to student object

            print(f"Prepared DeepFace DB with {students_with_photos_count} student photos.")

            if not student_map:
                 return Response({"error": "No students in this course have a profile photo uploaded for recognition. Please upload photos via the Students page."}, status=status.HTTP_400_BAD_REQUEST)


            # Use DeepFace.find()
            print("DeepFace: Starting face comparison...")
            # Ensure DeepFace is imported at the top: from deepface import DeepFace
            # Ensure required models and backends are installed

            # --- Mock DeepFace Call for testing structure ---
            # Replace with your actual DeepFace.find call
            # results_list_of_dfs = DeepFace.find(img_path=temp_image_path, db_path=db_path, model_name='VGG-Face', distance_metric='cosine', enforce_detection=True, detector_backend='opencv', threshold=0.4)
            # print(f"DeepFace comparison finished. Results count: {len(results_list_of_dfs)}")

            # --- Mock DeepFace Results for testing ---
            import pandas as pd
            mock_deepface_results_data = [
                # Example data structure from DeepFace.find results DataFrames
                # One DataFrame per detected face in the input image
                pd.DataFrame({
                    'identity': [f'{db_path}/identity_1/face.jpg', f'{db_path}/identity_1/face.jpg'],
                    'source_x': [10, 10], 'source_y': [20, 20], 'source_w': [50, 50], 'source_h': [50, 50],
                    'target_x': [100, 100], 'target_y': [120, 120], 'target_w': [50, 50], 'target_h': [50, 50],
                    'distance': [0.25, 0.3], # Lower distance is better match
                }),
                 pd.DataFrame({
                    'identity': [f'{db_path}/identity_5/face.jpg'],
                    'source_x': [200], 'source_y': [220], 'source_w': [60], 'source_h': [60],
                    'target_x': [300], 'target_y': [320], 'target_w': [60], 'target_h': [60],
                    'distance': [0.2],
                }),
                 # Example of a face detected but not matched below threshold
                 pd.DataFrame({
                    'identity': [f'{db_path}/unrecognized_temp_hash/some_face.jpg'], # Identity path might not be in the DB folder for unmatched
                    'source_x': [400], 'source_y': [420], 'source_w': [55], 'source_h': [55],
                    'target_x': [500], 'target_y': [520], 'target_w': [55], 'target_h': [55],
                    'distance': [0.55], # Above threshold
                })
            ]
            results_list_of_dfs = mock_deepface_results_data # Use mock data


            # Process results and mark attendance
            today = timezone.now().date() # Get today's date once

            total_faces_detected_in_photo = len(results_list_of_dfs) # Count how many faces DeepFace tried to match

            for df in results_list_of_dfs:
                # If the DataFrame is not empty, it means DeepFace found matches for this face
                if not df.empty:
                    # Get the identity path of the top match (usually the first row)
                    top_match_row = df.iloc[0]
                    identity_path = top_match_row['identity']

                    # Extract the identity key (e.g., 'identity_1') from the path
                    identity_folder_name = os.path.basename(os.path.dirname(identity_path))
                    student_key = identity_folder_name

                    # Check if this identified key maps back to a student in our enrolled list with photos
                    if student_key in student_map:
                        student = student_map[student_key]

                        # Mark attendance for this student if they haven't been marked yet TODAY for THIS course
                        if student.id not in recognized_student_ids:
                            recognized_student_ids.add(student.id) # Add to set to prevent duplicates

                            # Mark attendance record - get or create for today's date
                            record, created = AttendanceRecord.objects.get_or_create(
                                student=student,
                                course=course,
                                timestamp__date=today, # Filter by date only
                                defaults={'timestamp': timezone.now(), 'is_present': True} # Create if doesn't exist
                            )

                            if created:
                                # Add their serialized data to the response list
                                present_students_data.append(StudentSerializer(student).data)
                                print(f"Marked present: {student.first_name} {student.last_name}")


        except ValueError as e:
             print(f"DeepFace ValueError: {e}")
             if "Face could not be detected in the input image" in str(e):
                 return Response({
                     "status": "Attendance process failed",
                     "error": "No faces were detected in the photo. Please ensure faces are visible.",
                     "present_students": [], "recognized_faces_count": 0, "unrecognized_faces_count": 0,
                 }, status=status.HTTP_400_BAD_REQUEST)
             else:
                 return Response({
                     "status": "Attendance process failed",
                     "error": f"Error processing image: {str(e)}",
                     "present_students": [], "recognized_faces_count": 0, "unrecognized_faces_count": 0,
                 }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            print(f"An unexpected error occurred during attendance marking: {e}")
            return Response({
                "status": "Attendance process failed",
                "error": f"An internal server error occurred: {str(e)}",
                "present_students": [], "recognized_faces_count": 0, "unrecognized_faces_count": 0
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        finally:
            # *** IMPORTANT CLEANUP ***
            if temp_image_path and os.path.exists(temp_image_path):
                try:
                    os.remove(temp_image_path)
                    print(f"Cleaned up temporary image: {temp_image_path}")
                except OSError as e:
                    print(f"Error removing temporary image {temp_image_path}: {e}")

            if db_path and os.path.exists(db_path):
                 try:
                    shutil.rmtree(db_path)
                    print(f"Cleaned up temporary DeepFace DB: {db_path}")
                 except OSError as e:
                    print(f"Error removing temporary DeepFace DB directory {db_path}: {e}")


        return Response({
            "status": "Attendance marked successfully",
            "present_students": present_students_data,
            "recognized_faces_count": len(recognized_student_ids),
            "unrecognized_faces_count": max(0, total_faces_detected_in_photo - len(recognized_student_ids))
        }, status=status.HTTP_200_OK)


    @action(detail=True, methods=['get'], url_path='attendance-report')
    def attendance_report(self, request, pk=None):
        """
        Generate and download an Excel report for a specific date.
        Accessible via /api/courses/{course_id}/attendance-report/?date=YYYY-MM-DD
        """
        course = self.get_object()

        if course.teacher != request.user:
             return Response({"error": "You do not have permission to access reports for this course."}, status=status.HTTP_403_FORBIDDEN)

        date_str = request.query_params.get('date')

        if not date_str:
            return Response({'error': 'Date parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            report_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        records = AttendanceRecord.objects.filter(course=course, timestamp__date=report_date).select_related('student').order_by('student__student_id')

        present_student_student_ids = set(records.values_list('student__student_id', flat=True))

        all_students = course.students.all().order_by('student_id')

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"Attendance {report_date}"

        headers = ["Student ID", "First Name", "Last Name", "Email", "Level", "Status", "Timestamp (if present)"]
        ws.append(headers)

        for student in all_students:
            status = "Present" if student.student_id in present_student_student_ids else "Absent"
            attendance_timestamp = ''
            if status == "Present":
                 record = next((rec for rec in records if rec.student_id == student.id), None)
                 if record:
                      attendance_timestamp = record.timestamp.strftime('%Y-%m-%d %H:%M:%S')


            ws.append([
                student.student_id,
                student.first_name,
                student.last_name,
                student.email or '',
                student.level or '',
                status,
                attendance_timestamp
            ])

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="attendance_report_{course.course_code}_{report_date}.xlsx"'

        wb.save(response)

        return response


class StudentViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for viewing and editing students, including face enrollment.
    Teachers can only manage students enrolled in their courses.
    """
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filters students to only show those enrolled in courses taught by the logged-in user.
        """
        return Student.objects.filter(created_by=self.request.user).distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='enroll-face')
    def enroll_face(self, request, pk=None):
        """
        Upload and save a student's profile photo for DeepFace recognition.
        Accessible via /api/students/{student_id}/enroll-face/
        Expects 'image' (base64 string) in the request body.
        """
        student = self.get_object()

        if  student.created_by != request.user:
             return Response({"error": "You can now upload images for student you created."}, status=status.HTTP_403_FORBIDDEN)


        base64_image = request.data.get('image')

        if not base64_image:
             return Response({"error": "No image data provided."}, status=status.HTTP_400_BAD_REQUEST)


        try:
            if not os.path.exists(settings.MEDIA_ROOT):
                os.makedirs(settings.MEDIA_ROOT)

            if ';base64,' in base64_image:
                format, imgstr = base64_image.split(';base64,')
                ext = format.split('/')[-1].split(';')[0]
            else:
                 if base64_image.startswith('/9j/'): ext = 'jpg'
                 elif base64_image.startswith('iVBORw0KGgo'): ext = 'png'
                 else:
                     return Response({"error": "Could not determine image format. Ensure base64 string is correct."}, status=status.HTTP_400_BAD_REQUEST)
                 imgstr = base64_image

            if ext not in ['jpeg', 'jpg', 'png']:
                 return Response({"error": "Invalid image format. Only JPEG and PNG are supported."}, status=status.HTTP_400_BAD_REQUEST)

            imgstr += '=' * (-len(imgstr) % 4) # Add padding
            image_data = base64.b64decode(imgstr)

            image_filename = f'student_{student.id}_{os.urandom(4).hex()}.{ext}'

            file_content = ContentFile(image_data)

            # Remove old picture before saving new one if necessary
            if student.profile_photo:
                 old_path = student.profile_photo.path
                 if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                        print(f"Removed old photo: {old_path}")
                    except OSError as e:
                        print(f"Error removing old photo {old_path}: {e}")


            student.profile_photo.save(image_filename, file_content, save=True)

            serializer = self.get_serializer(student)
            return Response(serializer.data, status=status.HTTP_200_OK) # Use 200 OK for update/save

        except Exception as e:
            print(f"Error during face enrollment photo upload for student {student.id}: {e}")
            return Response({"error": f"An error occurred during photo upload: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)