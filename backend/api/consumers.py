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
        self.is_closing = False
        
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
        self.is_closing = True
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
                if not self.is_closing:
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
        FINAL VERSION: Integrates smart tracking to skip already-recognized faces.
        """
        try:
            processed_img = self._preprocess_image_for_recognition(original_img)

            extracted_faces = DeepFace.extract_faces(
                img_path=processed_img,
                detector_backend='opencv',
                enforce_detection=False
            )

            faces_for_frontend = []
            newly_confirmed_this_frame = []

            for face_data in extracted_faces:
                face_image = face_data['face']
                face_region = face_data['facial_area']

                # Step 1: Check if face is in an already confirmed location
                if self._is_face_in_tracked_location(face_region):
                    continue # Skip this face, it's already been confirmed

                # Step 2: Assess face quality
                if not self._is_face_high_quality(face_image, face_region):
                    continue

                # Step 3: Recognize the high-quality face
                dfs = DeepFace.find(
                    img_path=face_image,
                    db_path=self.db_path,
                    model_name=MODEL_NAME,
                    distance_metric=DISTANCE_METRIC,
                    enforce_detection=False,
                    silent=True,
                    threshold=RECOGNITION_THRESHOLD
                )

                if not (dfs and isinstance(dfs, list) and len(dfs) > 0 and not dfs[0].empty):
                    continue

                df = dfs[0]
                best_match = df.iloc[0]
                
                distance = float('inf')
                distance_col_name = f"{MODEL_NAME}_{DISTANCE_METRIC}"
                
                if distance_col_name in df.columns:
                    distance = best_match.get(distance_col_name, float('inf'))
                elif 'distance' in df.columns:
                    distance = best_match.get('distance', float('inf'))
                else:
                    continue

                box = {
                    'source_x': int(face_region.get('x', 0)),
                    'source_y': int(face_region.get('y', 0)),
                    'source_w': int(face_region.get('w', 50)),
                    'source_h': int(face_region.get('h', 50))
                }
                
                result_data = {'box': box, 'name': 'Unknown', 'status': 'unknown'}

                if distance <= RECOGNITION_THRESHOLD:
                    try:
                        identity_path = best_match['identity']
                        filename = os.path.basename(identity_path)
                        student_id_str = filename.split('_')[1].split('.')[0] if filename.startswith('student_') else filename.split('.')[0]
                        student_id = int(student_id_str)
                        
                        student = Student.objects.get(id=student_id)
                        result_data['name'] = f"{student.first_name} {student.last_name}".strip()
                        
                        if student_id in self.session_recognized_students:
                            result_data['status'] = 'confirmed'
                        else:
                            current_sightings = self.session_sighting_counts.get(student_id, 0) + 1
                            self.session_sighting_counts[student_id] = current_sightings
                            
                            if current_sightings >= SIGHTING_THRESHOLD:
                                self.session_recognized_students.add(student_id)
                                newly_confirmed_this_frame.append({'id': student.id, 'name': result_data['name']})
                                result_data['status'] = 'confirmed'
                                # NEW: Add the location of the newly confirmed face for tracking
                                self.session_confirmed_face_locations.append(face_region)
                            else:
                                result_data['status'] = 'sighted'
                                
                    except (ValueError, IndexError, Student.DoesNotExist) as e:
                        logger.warning(f"Error processing recognized face: {e}")
                
                faces_for_frontend.append(result_data)

            return faces_for_frontend, newly_confirmed_this_frame

        except Exception as e:
            logger.error(f"Error in recognition thread: {e}", exc_info=True)
            return [], []
        
        
    def _is_face_high_quality(self, face_image: np.ndarray, face_region: dict) -> bool:
        """
        NEW: Assesses if a detected face meets quality standards for recognition.
        """
        # --- Constants for Quality ---
        MIN_FACE_RESOLUTION = 100  # Pixels
        MIN_SHARPNESS = 100.0  # Unitless, based on Laplacian variance
        MIN_BRIGHTNESS = 50  # 0-255
        MAX_BRIGHTNESS = 200 # 0-255

        # 1. Check Resolution
        # The face_region from extract_faces gives 'w' and 'h'
        if face_region['w'] < MIN_FACE_RESOLUTION or face_region['h'] < MIN_FACE_RESOLUTION:
            logger.info(f"Skipping face due to low resolution: {face_region['w']}x{face_region['h']}")
            return False

        # 2. Check Sharpness (Blur)
        gray_face = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray_face, cv2.CV_64F).var()
        if sharpness < MIN_SHARPNESS:
            logger.info(f"Skipping face due to blurriness. Sharpness: {sharpness:.2f}")
            return False

        # 3. Check Brightness
        brightness = np.mean(gray_face)
        if not (MIN_BRIGHTNESS < brightness < MAX_BRIGHTNESS):
            logger.info(f"Skipping face due to poor brightness: {brightness:.2f}")
            return False
            
        logger.info(f"Face passed quality checks. Resolution: {face_region['w']}x{face_region['h']}, Sharpness: {sharpness:.2f}, Brightness: {brightness:.2f}")
        return True
    
    
    
    def _calculate_iou(self, boxA, boxB):
        """
        logic that can tell if two bounding boxes on the screen are in the same location. 
        This is done with a standard algorithm called 'Intersection over Union' (IoU).
        """
        # Determine the (x, y)-coordinates of the intersection rectangle
        xA = max(boxA["x"], boxB["x"])
        yA = max(boxA["y"], boxB["y"])
        xB = min(boxA["x"] + boxA["w"], boxB["x"] + boxB["w"])
        yB = min(boxA["y"] + boxA["h"], boxB["y"] + boxB["h"])

        # Compute the area of intersection
        interArea = max(0, xB - xA) * max(0, yB - yA)

        # Compute the area of both the prediction and ground-truth rectangles
        boxAArea = boxA["w"] * boxA["h"]
        boxBArea = boxB["w"] * boxB["h"]

        # Compute the intersection over union
        iou = interArea / float(boxAArea + boxBArea - interArea)
        
        return iou

    def _is_face_in_tracked_location(self, face_region: dict) -> bool:
        """
        NEW: Checks if a face region overlaps significantly with an already confirmed location.
        """
        IOU_THRESHOLD = 0.7 # High threshold to be confident it's the same location

        for confirmed_box in self.session_confirmed_face_locations:
            iou = self._calculate_iou(face_region, confirmed_box)
            if iou > IOU_THRESHOLD:
                logger.info(f"Skipping face as it overlaps with a confirmed location. IoU: {iou:.2f}")
                return True
        return False
        
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
        """Helper to send JSON data, checking if the connection is closing."""
        if not self.is_closing:
            await self.send(text_data=json.dumps(data))

    async def send_error_and_close(self, message):
        """Send an error message and close the connection."""
        if not self.is_closing:
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
        except Exception as e:
            logger.error(f"Failed to prepare face database for course {self.course_id}: {e}", exc_info=True)
            return False

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