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
from django.utils import timezone
from .models import Course, Student, AttendanceRecord
from deepface import DeepFace

# --- INTELLIGENT, ROBUST, PRODUCTION-GRADE CONSUMER ---

# --- LAYER 1: BEST-IN-CLASS MODEL ---
MODEL_NAME = "ArcFace"
DISTANCE_METRIC = "cosine"
# For ArcFace + Cosine, a good threshold is a distance < 0.68. Lower is a better match.
RECOGNITION_THRESHOLD = 0.68

# --- LAYER 3: SIGHTING CONFIRMATION ---
# A student must be "sighted" this many times before being confirmed as present.
SIGHTING_THRESHOLD = 3 


class AttendanceConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
            
        self.course_id = self.scope['url_route']['kwargs']['course_id']
        self.room_group_name = f'attendance_{self.course_id}'
        self.db_path = os.path.join(settings.MEDIA_ROOT, f'temp_course_db_{self.course_id}_{self.channel_name}')
        
        # --- NEW STATE FOR ROBUSTNESS ---
        self.session_recognized_students = set() # Stores confirmed students
        self.session_sighting_counts = {}       # Stores sighting counts for each student ID
        
        await self.accept()
        success = await self.prepare_known_faces()
        if not success:
            await self.send(text_data=json.dumps({'type': 'error', 'message': 'Setup failed. Ensure students have profile photos.'}))
            await self.close(code=4004)
            return
            
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.send(text_data=json.dumps({'type': 'session_ready'}))
        print(f"Intelligent Attendance session started for course {self.course_id}")

    async def disconnect(self, close_code):
        await self.cleanup_known_faces()
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            image_b64 = data.get('image', '').split(';base64,', 1)[-1]
            if not image_b64: return

            image_data = base64.b64decode(image_b64)
            nparr = np.frombuffer(image_data, np.uint8)
            original_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if original_img is None: return

            # --- INTELLIGENT WORKFLOW ---
            annotated_img, newly_confirmed_students = await self.find_and_annotate_frame(original_img)
            
            for student_data in newly_confirmed_students:
                await self.mark_student_present(student_data['id'], self.course_id)

            _, buffer = cv2.imencode('.jpg', annotated_img, [cv2.IMWRITE_JPEG_QUALITY, 75])
            annotated_image_b64 = base64.b64encode(buffer).decode('utf-8')

            await self.send(text_data=json.dumps({
                'type': 'frame_update',
                'annotated_image': f"data:image/jpeg;base64,{annotated_image_b64}",
                'newly_recognized': newly_confirmed_students, # Changed from newly_recognized
                'total_recognized_count': len(self.session_recognized_students)
            }))

        except Exception as e:
            import traceback
            traceback.print_exc()

    def _preprocess_image_for_matching(self, img: np.ndarray):
        """
        --- LAYER 2: ADAPTIVE IMAGE ENHANCEMENT ---
        Applies CLAHE to improve contrast in low-light images.
        """
        # Convert to LAB color space, which separates lightness from color
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE to the L-channel (lightness)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        
        # Merge the enhanced L-channel back and convert to BGR
        limg = cv2.merge((cl, a, b))
        enhanced_img = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        return enhanced_img

    @sync_to_async
    def find_and_annotate_frame(self, original_img: np.ndarray):
        """The complete, robust recognition and annotation pipeline."""
        newly_confirmed_this_frame = []
        
        # Create a copy for drawing so the original is preserved
        annotated_img = original_img.copy()

        # 1. Pre-process the image to enhance it for recognition
        enhanced_img = self._preprocess_image_for_matching(original_img)

        try:
            # 2. Find faces in the *enhanced* image
            dfs = DeepFace.find(
                img_path=enhanced_img,
                db_path=self.db_path,
                model_name=MODEL_NAME,
                distance_metric=DISTANCE_METRIC,
                enforce_detection=False,
                detector_backend='opencv',
                silent=True
            )

            if not (dfs and isinstance(dfs, list)):
                return annotated_img, []

            for df in dfs:
                if df.empty: continue

                best_match = df.iloc[0]
                distance = best_match.get(DISTANCE_METRIC, float('inf'))
                
                box = best_match[['source_x', 'source_y', 'source_w', 'source_h']].to_dict()
                x, y, w, h = int(box['source_x']), int(box['source_y']), int(box['source_w']), int(box['source_h'])

                if distance < RECOGNITION_THRESHOLD:
                    student_id = int(os.path.splitext(os.path.basename(best_match['identity']))[0].split('_')[1])
                    
                    # If student is already confirmed, just draw a green box and continue
                    if student_id in self.session_recognized_students:
                        student = Student.objects.get(id=student_id)
                        self._draw_box(annotated_img, f"{student.first_name}", x, y, w, h, (0, 255, 0)) # Green
                        continue

                    # --- LAYER 3 LOGIC ---
                    # Increment sighting count for this student
                    current_sightings = self.session_sighting_counts.get(student_id, 0) + 1
                    self.session_sighting_counts[student_id] = current_sightings
                    
                    if current_sightings >= SIGHTING_THRESHOLD:
                        # CONFIRMED: Student has been seen enough times
                        self.session_recognized_students.add(student_id)
                        student = Student.objects.get(id=student_id)
                        name = f"{student.first_name}"
                        newly_confirmed_this_frame.append({'id': student.id, 'name': name})
                        self._draw_box(annotated_img, name, x, y, w, h, (0, 255, 0)) # Green
                    else:
                        # SIGHTED: Seen, but not yet confirmed. Draw a yellow box.
                        student = Student.objects.get(id=student_id)
                        self._draw_box(annotated_img, f"{student.first_name}?", x, y, w, h, (0, 255, 255)) # Yellow
                else:
                    self._draw_box(annotated_img, "Unknown", x, y, w, h, (0, 0, 255)) # Red
            
            return annotated_img, newly_confirmed_this_frame

        except Exception as e:
            return annotated_img, []

    @sync_to_async
    def prepare_known_faces(self):
        """Sets up the temp DB. MUST use the same model as the find call."""
        try:
            if os.path.exists(self.db_path): shutil.rmtree(self.db_path)
            os.makedirs(self.db_path)
            course = Course.objects.prefetch_related('students').get(id=self.course_id)
            students = [s for s in course.students.all() if s.profile_photo and hasattr(s.profile_photo, 'path')]
            if not students: return False
            for student in students:
                source_path = student.profile_photo.path
                if os.path.exists(source_path):
                    _, extension = os.path.splitext(source_path)
                    dest_path = os.path.join(self.db_path, f"student_{student.id}{extension}")
                    shutil.copy(source_path, dest_path)
            if not os.listdir(self.db_path): return False
            
            # CRITICAL: Must use the same model here!
            DeepFace.find(img_path=np.zeros((100, 100, 3), dtype=np.uint8), db_path=self.db_path, model_name=MODEL_NAME, enforce_detection=False, silent=True)
            return True
        except Exception:
            self.cleanup_known_faces()
            return False

    def _draw_box(self, img, name, x, y, w, h, color):
        """Helper to draw colored boxes and names."""
        cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)
        font = cv2.FONT_HERSHEY_DUPLEX
        (text_w, text_h), _ = cv2.getTextSize(name, font, 0.8, 1)
        cv2.rectangle(img, (x, y - text_h - 10), (x + w, y), color, -1)
        cv2.putText(img, name, (x + 6, y - 6), font, 0.8, (0, 0, 0), 1)

    # --- Unchanged Methods ---
    @sync_to_async
    def cleanup_known_faces(self):
        if hasattr(self, 'db_path') and os.path.exists(self.db_path):
            shutil.rmtree(self.db_path)
            
    @staticmethod
    @sync_to_async
    def mark_student_present(student_id: int, course_id: int):
        AttendanceRecord.objects.get_or_create(
            student_id=student_id,
            course_id=course_id,
            timestamp__date=timezone.now().date(),
            defaults={'timestamp': timezone.now()}
        )