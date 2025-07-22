# facials/backend/api/consumers.py

import json
import base64
import os
import shutil
import cv2
import numpy as np
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from .models import Course, Student, AttendanceRecord
from deepface import DeepFace

# --- Advanced Consumer with Robust Error Handling and Efficiency ---

class AttendanceConsumer(AsyncWebsocketConsumer):
    """
    Handles real-time attendance marking via WebSockets.
    Manages a temporary face database for the duration of the session.
    """

    async def connect(self):
        # 1. AUTHENTICATION & SETUP
        # Ensure the user is authenticated before allowing a connection.
        # The 'user' is added to the scope by Django Channels' AuthMiddlewareStack.
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.course_id = self.scope['url_route']['kwargs']['course_id']
        self.room_group_name = f'attendance_{self.course_id}'
        
        # This set will track students recognized *during this specific session*.
        self.session_recognized_students = set()

        # 2. PREPARATION: Create a temporary, isolated database path for this session.
        # This prevents conflicts if multiple teachers take attendance simultaneously.
        self.db_path = os.path.join(settings.MEDIA_ROOT, f'temp_course_db_{self.course_id}_{self.channel_name}')
        
        # 3. ACCEPT & PREPARE KNOWN FACES
        await self.accept()
        
        # Prepare the known faces database. If it fails (e.g., no students), close the connection.
        success = await self.prepare_known_faces()
        if not success:
            await self.close(code=4004) # Custom close code for "No students to recognize"
            return
            
        # 4. JOIN CHANNEL GROUP
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        
        print(f"User {self.user.username} connected to attendance session for course {self.course_id}")
        # Optionally send a 'ready' message to the frontend.
        await self.send(text_data=json.dumps({'type': 'session_ready'}))

    async def disconnect(self, close_code):
        # Ensure cleanup happens on disconnect.
        await self.cleanup_known_faces()
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        print(f"WebSocket disconnected with code: {close_code}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            image_b64 = data.get('image', '').split(';base64,', 1)[-1]

            if not image_b64:
                return # Ignore empty frames

            # Run the blocking face recognition task in a separate thread.
            matched_students = await self.find_faces_in_frame(image_b64)

            # Process all newly found matches.
            for student in matched_students:
                if student and student.id not in self.session_recognized_students:
                    self.session_recognized_students.add(student.id)
                    
                    # Mark attendance in the database.
                    await self.mark_student_present(student)
                    
                    # Send confirmation back to the frontend.
                    await self.send(text_data=json.dumps({
                        'type': 'match_found',
                        'student_id': student.id,
                        'student_name': f"{student.first_name} {student.last_name}",
                    }))
        except (json.JSONDecodeError, IndexError) as e:
            print(f"Error decoding message: {e}")
        except Exception as e:
            print(f"An unexpected error occurred in receive: {e}")

    # --- HELPER METHODS (Running in separate threads) ---

    @sync_to_async
    def prepare_known_faces(self):
        """
        Queries the database for enrolled students with photos and copies them
        to a temporary directory for DeepFace to use. This is a critical
        performance optimization done once per session.
        """
        try:
            # Create the temporary directory.
            if not os.path.exists(self.db_path):
                os.makedirs(self.db_path)
            
            # Find the course and its students with profile photos.
            course = Course.objects.prefetch_related('students').get(id=self.course_id)
            enrolled_students_with_photos = [s for s in course.students.all() if s.profile_photo]

            if not enrolled_students_with_photos:
                print(f"Warning: No students with profile photos in course {self.course_id}.")
                return False

            # Copy photos to the temp directory, naming them for easy identification.
            for student in enrolled_students_with_photos:
                # Naming convention: student_{id}.jpg
                destination_path = os.path.join(self.db_path, f"student_{student.id}.jpg")
                if os.path.exists(student.profile_photo.path):
                    shutil.copy(student.profile_photo.path, destination_path)
            
            # Pre-build the representations file for a massive speed-up.
            # This makes subsequent 'find' calls much faster.
            DeepFace.find(
                img_path=np.zeros((100, 100, 3), dtype=np.uint8), # Dummy image
                db_path=self.db_path,
                model_name="VGG-Face",
                enforce_detection=False
            )
            print(f"Prepared known faces DB for course {self.course_id} at {self.db_path}")
            return True
        except Course.DoesNotExist:
            print(f"Error: Course with ID {self.course_id} not found.")
            return False
        except Exception as e:
            print(f"An error occurred during face preparation: {e}")
            return False

    @sync_to_async
    def find_faces_in_frame(self, image_b64: str) -> list[Student]:
        """
        Analyzes a single video frame, finds all faces, and returns a list
        of matched Student objects from the database.
        """
        try:
            # Decode the base64 image into a numpy array for OpenCV/DeepFace.
            image_data = base64.b64decode(image_b64)
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return [] # Invalid image data

            # Find all faces in the frame and compare against our pre-built DB.
            dfs = DeepFace.find(
                img_path=img,
                db_path=self.db_path,
                model_name="VGG-Face",
                enforce_detection=False # Don't crash if no face is in the frame
            )
            
            matched_student_ids = set()
            # DeepFace returns a list of dataframes, one for each face found in img_path.
            for df in dfs:
                if not df.empty and 'identity' in df.columns:
                    for identity_path in df['identity'].tolist():
                        # Extract the student ID from the filename 'student_{id}.jpg'
                        try:
                            student_id = int(os.path.basename(identity_path).split('_')[1].split('.')[0])
                            matched_student_ids.add(student_id)
                        except (IndexError, ValueError):
                            continue # Ignore badly named files
            
            if not matched_student_ids:
                return []

            # Return a list of the actual Student model instances.
            return list(Student.objects.filter(id__in=matched_student_ids))
        except Exception as e:
            print(f"DeepFace recognition error: {e}")
            return []

    @sync_to_async
    def mark_student_present(self, student: Student):
        """Creates an AttendanceRecord for the given student on the current day."""
        from django.utils import timezone
        AttendanceRecord.objects.get_or_create(
            student=student,
            course_id=self.course_id,
            timestamp__date=timezone.now().date(),
            defaults={'timestamp': timezone.now()}
        )

    @sync_to_async
    def cleanup_known_faces(self):
        """Safely removes the temporary face database directory."""
        if hasattr(self, 'db_path') and os.path.exists(self.db_path):
            shutil.rmtree(self.db_path)
            print(f"Cleaned up temporary DB at {self.db_path}")