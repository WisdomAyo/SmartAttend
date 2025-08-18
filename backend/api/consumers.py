# backend/api/consumers.py - FIXED FACE RECOGNITION VERSION

import json
import base64
import os
import shutil
import cv2
import numpy as np
import logging
import asyncio
from typing import Dict, Set
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from django.utils import timezone
from .models import Course, Student, AttendanceRecord
from deepface import DeepFace

logger = logging.getLogger(__name__)

# --- IMPROVED Configuration Constants ---
MODEL_NAME = getattr(settings, 'FACE_RECOGNITION_MODEL', 'VGG-Face')  # Changed to more reliable model
DISTANCE_METRIC = "cosine"
RECOGNITION_THRESHOLD = getattr(settings, 'FACE_RECOGNITION_THRESHOLD', 0.50)  # Relaxed threshold
SIGHTING_THRESHOLD = 2  # Reduced for faster recognition

class AttendanceConsumer(AsyncWebsocketConsumer):
    """
    Fixed face recognition consumer with improved matching accuracy.
    """
    
    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
            
        self.course_id = self.scope['url_route']['kwargs']['course_id']
        self.room_group_name = f'attendance_{self.course_id}'
        self.db_path = os.path.join(settings.MEDIA_ROOT, f'temp_session_db_{self.course_id}_{self.channel_name}')
        
        # Session state
        self.session_recognized_students: Set[int] = set()
        self.session_sighting_counts: Dict[int, int] = {}
        
        # Task queue and processing flag
        self.task_queue = asyncio.Queue(maxsize=1)
        # self.is_processing = False
        
        await self.accept()
        
        success = await self.prepare_face_db_for_deepface()
        if not success:
            await self.send_error_and_close('Failed to prepare face recognition database.')
            return
            
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        
        # Start the background processing loop
        self.processing_task = asyncio.create_task(self.background_processor())
        
        await self.send_json({'type': 'session_ready'})
        logger.info(f"Attendance session started for course {self.course_id}")

    async def disconnect(self, close_code):
        """Handle disconnection and gracefully shut down the background task."""
        if hasattr(self, 'processing_task') and not self.processing_task.done():
            self.processing_task.cancel()
        await self.cleanup_resources()
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        logger.info(f"Attendance session ended for course {getattr(self, 'course_id', 'unknown')}")

    async def receive(self, text_data):
        """
        Receives a frame and puts it into the queue.
        """
        try:
            
            if self.task_queue.full():
                return 
            
            
            data = json.loads(text_data)
            image_b64 = data.get('image', '').split(';base64,', 1)[-1]
            if not image_b64:
                return
            
            # Put the raw data into the queue for the background task
            await self.task_queue.put(image_b64)
            
        except json.JSONDecodeError:
            logger.warning("Received invalid JSON.")
        except Exception as e:
            logger.error(f"Error in receive method: {e}", exc_info=True)

    async def background_processor(self):
        """
        Background task that processes frames from the queue.
        """
        while True:
            try:
                # Wait for a frame to arrive in the queue
                image_b64 = await self.task_queue.get()
                
                # Decode and process the image
                image_data = base64.b64decode(image_b64)
                nparr = np.frombuffer(image_data, np.uint8)
                original_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if original_img is None:
                    continue

                # Run face recognition in separate thread
                faces_data, newly_confirmed = await self._run_recognition_in_thread(original_img)
                
                # Mark attendance for newly confirmed students
                for student_data in newly_confirmed:
                    await self.mark_student_present(student_data['id'], self.course_id)
                
                # Send results back to client
                await self.send_json({
                    'type': 'face_data',
                    'faces': faces_data,
                    'newly_recognized': newly_confirmed,
                    'total_recognized_count': len(self.session_recognized_students),
                })
                
                # Mark task as done
                self.task_queue.task_done()

            except asyncio.CancelledError:
                logger.info("Background processor task was cancelled.")
                break
            except Exception as e:
                logger.error(f"Error in background processor: {e}", exc_info=True)

    @sync_to_async
    def _run_recognition_in_thread(self, original_img: np.ndarray):
        """
        FIXED: Improved face recognition with better image preprocessing and matching.
        """
        try:
            # IMPROVED: Better image preprocessing
            processed_img = self._preprocess_image_for_recognition(original_img)
            
            # # Save processed image temporarily for DeepFace
            # temp_img_path = os.path.join(settings.MEDIA_ROOT, f'temp_frame_{self.channel_name}.jpg')
            # cv2.imwrite(temp_img_path, processed_img)
            
            # try:
            # FIXED: Use more reliable DeepFace parameters
            dfs = DeepFace.find(
                img_path=processed_img, 
                db_path=self.db_path, 
                model_name=MODEL_NAME,
                distance_metric=DISTANCE_METRIC, 
                enforce_detection=False,  # Don't fail if no face detected
                detector_backend='opencv',
                silent=True,
                threshold=RECOGNITION_THRESHOLD  # Use explicit threshold
            )

            faces_for_frontend = []
            newly_confirmed_this_frame = []

            if dfs and isinstance(dfs, list) and len(dfs) > 0:
                for df in dfs:
                    if df.empty:
                        continue 

                    # Get the best match
                    best_match = df.iloc[0]
                    
                    if 'distance' not in df.columns:
                        continue
                    
                    
                    distance = best_match.get(DISTANCE_METRIC, float('inf'))
                    
                    # FIXED: Better bounding box handling
                    try:
                        box = {
                            'source_x': int(best_match.get('source_x', 0)),
                            'source_y': int(best_match.get('source_y', 0)),
                            'source_w': int(best_match.get('source_w', 50)),
                            'source_h': int(best_match.get('source_h', 50))
                        }
                    except (ValueError, TypeError):
                        # Fallback box if coordinates are invalid
                        box = {'source_x': 0, 'source_y': 0, 'source_w': 50, 'source_h': 50}
                    
                    face_data = {
                        'box': box, 
                        'name': 'Unknown', 
                        'status': 'unknown',
                        'confidence': 1.0 - distance  # Convert distance to confidence
                    }
                    
                    logger.info(f"Face detected with distance: {distance}, threshold: {RECOGNITION_THRESHOLD}")
                    
                    # FIXED: More lenient matching logic
                    if distance <= RECOGNITION_THRESHOLD:  # Use <= instead of <
                        try:
                            identity_path = best_match['identity']
                            
                            # IMPROVED: More robust student ID extraction
                            filename = os.path.basename(identity_path)
                            # Handle both formats: student_123.jpg and 123.jpg
                            if filename.startswith('student_'):
                                student_id_str = filename.split('_')[1].split('.')[0]
                            else:
                                student_id_str = filename.split('.')[0]
                            
                            student_id = int(student_id_str)
                            
                            # Get student from database
                            student = Student.objects.get(id=student_id)
                            face_data['name'] = f"{student.first_name} {student.last_name}".strip()
                            
                            if student_id in self.session_recognized_students:
                                face_data['status'] = 'confirmed'
                            else:
                                # IMPROVED: More generous sighting logic
                                current_sightings = self.session_sighting_counts.get(student_id, 0) + 1
                                self.session_sighting_counts[student_id] = current_sightings
                                
                                logger.info(f"Student {student.first_name} sighted {current_sightings} times")
                                
                                if current_sightings >= SIGHTING_THRESHOLD:
                                    self.session_recognized_students.add(student_id)
                                    newly_confirmed_this_frame.append({
                                        'id': student.id, 
                                        'name': face_data['name'],
                                        'confidence': face_data['confidence']
                                    })
                                    face_data['status'] = 'confirmed'
                                    logger.info(f"Student {student.first_name} CONFIRMED for attendance")
                                else:
                                    face_data['status'] = 'sighted'
                                    
                        except (ValueError, IndexError, Student.DoesNotExist) as e:
                            logger.warning(f"Error processing recognized face: {e}")
                            face_data['name'] = 'Unknown Student'
                            face_data['status'] = 'unknown'
                    else:
                        logger.info(f"Face distance {distance} exceeds threshold {RECOGNITION_THRESHOLD}")
                    
                    faces_for_frontend.append(face_data)
            else:
                logger.info("No faces detected in frame")
            
            return faces_for_frontend, newly_confirmed_this_frame
            
        except Exception as e:
            logger.error(f"Error in recognition thread: {e}", exc_info=True)
            return [], []
    
    def _preprocess_image_for_recognition(self, img):
        """
        IMPROVED: Better image preprocessing for more accurate face recognition.
        """
        try:
            # Resize image to reasonable size for processing
            height, width = img.shape[:2]
            if width > 640:
                scale = 640 / width
                new_width = int(width * scale)
                new_height = int(height * scale)
                img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_AREA)
            
            # Improve image quality
            # 1. Convert to LAB color space for better lighting normalization
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # 2. Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to L channel
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            l_clahe = clahe.apply(l)
            
            # 3. Merge channels and convert back to BGR
            enhanced_img = cv2.merge((l_clahe, a, b))
            enhanced_img = cv2.cvtColor(enhanced_img, cv2.COLOR_LAB2BGR)
            
            # 4. Slight blur to reduce noise
            enhanced_img = cv2.GaussianBlur(enhanced_img, (3, 3), 0)
            
            return enhanced_img
            
        except Exception as e:
            logger.warning(f"Error in image preprocessing: {e}")
            return img  # Return original if preprocessing fails
            
    # --- Helper methods ---
    async def send_json(self, data):
        """Helper to send JSON data."""
        await self.send(text_data=json.dumps(data))

    async def send_error_and_close(self, message):
        """Send an error message and close the connection."""
        await self.send_json({'type': 'error', 'message': message})
        await self.close(code=4000)

    @sync_to_async
    def prepare_face_db_for_deepface(self):
        """
        IMPROVED: Better database preparation with validation.
        """
        try:
            # Clean up existing database
            if os.path.exists(self.db_path): shutil.rmtree(self.db_path)
            os.makedirs(self.db_path, exist_ok=True)
            course = Course.objects.prefetch_related('students').get(id=self.course_id)
            students = [s for s in course.students.all() if s.profile_photo]
            if not students: return False
            for student in students:
                source_path = student.profile_photo.path
                if os.path.exists(source_path):
                    _, ext = os.path.splitext(source_path)
                    shutil.copy(source_path, os.path.join(self.db_path, f"student_{student.id}{ext}"))
            if not os.listdir(self.db_path): return False
            first_image_path = os.path.join(self.db_path, os.listdir(self.db_path)[0])
            DeepFace.find(img_path=first_image_path, db_path=self.db_path, model_name=MODEL_NAME, enforce_detection=False, silent=True)
            if not any(f.endswith('.pkl') for f in os.listdir(self.db_path)): return False
            return True
        except: return False

    # --- Other helper methods are unchanged ---
    async def send_json(self, data):
        await self.send(text_data=json.dumps(data))
    async def send_error_and_close(self, message):
        await self.send_json({'type': 'error', 'message': message})
        await self.close(code=4000)

    @sync_to_async
    def cleanup_resources(self):
        """Clean up temporary resources."""
        try:
            if hasattr(self, 'db_path') and self.db_path and os.path.exists(self.db_path):
                shutil.rmtree(self.db_path)
                logger.info(f"Cleaned up face database: {self.db_path}")
        except Exception as e:
            logger.warning(f"Error cleaning up resources: {e}")

    @staticmethod
    @sync_to_async
    def mark_student_present(student_id: int, course_id: int):
        """Mark student as present in attendance record.""" 
        try:
            _, created = AttendanceRecord.objects.get_or_create(
            student_id=student_id, 
            course_id=course_id, 
            timestamp__date=timezone.now().date(), 
            defaults={'timestamp': timezone.now(), 'is_present': True}
            )
            if created:
                logger.info(f"Marked student {student_id} present for course {course_id}")
            return created
        except Exception as e:
            logger.error(f"Error marking student {student_id} present: {e}")
            return False