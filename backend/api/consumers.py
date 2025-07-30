# backend/api/consumers.py - Updated for production with optimized face recognition

import json
import base64
import os
import shutil
import cv2
import numpy as np
import logging
from typing import Dict, List, Set
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from .models import Course, Student, AttendanceRecord
from .face_recognition_service import face_recognition_service

logger = logging.getLogger(__name__)

class AttendanceConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time attendance tracking with optimized face recognition
    """
    
    # Class-level configuration
    RECOGNITION_THRESHOLD = getattr(settings, 'FACE_RECOGNITION_THRESHOLD', 0.6)
    SIGHTING_THRESHOLD = 3  # Number of sightings needed for confirmation
    MAX_FACES_PER_FRAME = 50  # Limit faces processed per frame
    
    async def connect(self):
        """Handle WebSocket connection"""
        try:
            # Authenticate user
            self.user = self.scope.get("user")
            if not self.user or not self.user.is_authenticated:
                logger.warning("Unauthenticated WebSocket connection attempt")
                await self.close(code=4001)
                return
            
            # Extract course ID from URL
            self.course_id = self.scope['url_route']['kwargs']['course_id']
            self.room_group_name = f'attendance_{self.course_id}'
            
            # Initialize session state
            self.session_recognized_students: Set[int] = set()
            self.session_sighting_counts: Dict[int, int] = {}
            self.known_faces_cache: Dict[str, np.ndarray] = {}
            self.temp_directory = None
            
            # Accept connection
            await self.accept()
            
            # Prepare face recognition database
            success = await self.prepare_face_recognition_db()
            if not success:
                await self.send(text_data=json.dumps({
                    'type': 'error', 
                    'message': 'Failed to prepare face recognition. Ensure students have profile photos.'
                }))
                await self.close(code=4004)
                return
            
            # Join room group
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            
            # Send ready signal
            await self.send(text_data=json.dumps({
                'type': 'session_ready',
                'message': f'Attendance session ready for course {self.course_id}',
                'total_students': len(self.known_faces_cache)
            }))
            
            logger.info(f"Attendance session started for course {self.course_id} by user {self.user.id}")
            
        except Exception as e:
            logger.error(f"Error in WebSocket connect: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to initialize attendance session'
            }))
            await self.close(code=4000)

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        try:
            # Leave room group
            if hasattr(self, 'room_group_name'):
                await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            
            # Cleanup resources
            await self.cleanup_resources()
            
            logger.info(f"Attendance session ended for course {getattr(self, 'course_id', 'unknown')}")
            
        except Exception as e:
            logger.error(f"Error in WebSocket disconnect: {e}")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'frame')
            
            if message_type == 'frame':
                await self.process_frame(data)
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid message format'
            }))
        except Exception as e:
            logger.error(f"Error processing WebSocket message: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Error processing message'
            }))

    async def process_frame(self, data):
        """Process incoming video frame for face recognition"""
        try:
            # Extract and validate image data
            image_b64 = data.get('image', '').split(';base64,', 1)[-1]
            if not image_b64:
                return
            
            # Decode image
            image_data = base64.b64decode(image_b64)
            nparr = np.frombuffer(image_data, np.uint8)
            original_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if original_img is None:
                logger.warning("Could not decode received image")
                return
            
            # Process frame for face recognition
            annotated_img, newly_confirmed_students = await self.process_frame_for_recognition(original_img)
            
            # Mark newly confirmed students as present
            for student_data in newly_confirmed_students:
                await self.mark_student_present(student_data['id'], self.course_id)
            
            # Encode annotated image
            _, buffer = cv2.imencode('.jpg', annotated_img, [cv2.IMWRITE_JPEG_QUALITY, 75])
            annotated_image_b64 = base64.b64encode(buffer).decode('utf-8')
            
            # Send response
            await self.send(text_data=json.dumps({
                'type': 'frame_update',
                'annotated_image': f"data:image/jpeg;base64,{annotated_image_b64}",
                'newly_recognized': newly_confirmed_students,
                'total_recognized_count': len(self.session_recognized_students),
                'processing_stats': {
                    'faces_detected': len(newly_confirmed_students) if newly_confirmed_students else 0,
                    'total_known_faces': len(self.known_faces_cache)
                }
            }))
            
        except Exception as e:
            logger.error(f"Error processing frame: {e}")

    @sync_to_async
    def process_frame_for_recognition(self, original_img: np.ndarray):
        """Process frame for face recognition with sighting confirmation"""
        newly_confirmed_this_frame = []
        annotated_img = original_img.copy()
        
        try:
            # Preprocess image for better recognition
            enhanced_img = self._enhance_image_for_recognition(original_img)
            
            # Save temporary image for processing
            temp_image_path = self._save_temp_image(enhanced_img)
            if not temp_image_path:
                return annotated_img, []
            
            # Find faces using optimized service
            detected_faces = face_recognition_service.find_faces_in_image(
                temp_image_path, 
                self.known_faces_cache
            )
            
            # Process each detected face
            for face_info in detected_faces[:self.MAX_FACES_PER_FRAME]:  # Limit processing
                bbox = face_info['bbox']
                x, y, w, h = bbox
                student_id = face_info.get('student_id')
                confidence = face_info.get('confidence', 0)
                
                if student_id and confidence > (1 - self.RECOGNITION_THRESHOLD):
                    # Convert student_id to integer if it's a string
                    try:
                        student_id = int(student_id.replace('student_', '')) if isinstance(student_id, str) else student_id
                    except (ValueError, AttributeError):
                        continue
                    
                    # Check if already confirmed
                    if student_id in self.session_recognized_students:
                        student = Student.objects.get(id=student_id)
                        self._draw_recognition_box(
                            annotated_img, 
                            f"{student.first_name}", 
                            x, y, w, h, 
                            (0, 255, 0),  # Green for confirmed
                            confidence
                        )
                        continue
                    
                    # Increment sighting count
                    current_sightings = self.session_sighting_counts.get(student_id, 0) + 1
                    self.session_sighting_counts[student_id] = current_sightings
                    
                    if current_sightings >= self.SIGHTING_THRESHOLD:
                        # Confirmed recognition
                        self.session_recognized_students.add(student_id)
                        student = Student.objects.get(id=student_id)
                        
                        newly_confirmed_this_frame.append({
                            'id': student.id,
                            'name': f"{student.first_name} {student.last_name}",
                            'student_id': student.student_id,
                            'confidence': confidence
                        })
                        
                        self._draw_recognition_box(
                            annotated_img, 
                            f"{student.first_name}", 
                            x, y, w, h, 
                            (0, 255, 0),  # Green for confirmed
                            confidence
                        )
                    else:
                        # Potential recognition (needs more sightings)
                        student = Student.objects.get(id=student_id)
                        self._draw_recognition_box(
                            annotated_img, 
                            f"{student.first_name}? ({current_sightings}/{self.SIGHTING_THRESHOLD})", 
                            x, y, w, h, 
                            (0, 255, 255),  # Yellow for potential
                            confidence
                        )
                else:
                    # Unknown face
                    self._draw_recognition_box(
                        annotated_img, 
                        "Unknown", 
                        x, y, w, h, 
                        (0, 0, 255),  # Red for unknown
                        confidence
                    )
            
            # Clean up temporary file
            if temp_image_path and os.path.exists(temp_image_path):
                os.remove(temp_image_path)
            
            return annotated_img, newly_confirmed_this_frame
            
        except Exception as e:
            logger.error(f"Error in face recognition processing: {e}")
            return annotated_img, []

    def _enhance_image_for_recognition(self, img: np.ndarray) -> np.ndarray:
        """Enhance image quality for better face recognition"""
        try:
            # Convert to LAB color space
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # Apply CLAHE to improve contrast
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            
            # Merge back and convert to BGR
            enhanced_img = cv2.merge((cl, a, b))
            enhanced_img = cv2.cvtColor(enhanced_img, cv2.COLOR_LAB2BGR)
            
            return enhanced_img
            
        except Exception as e:
            logger.error(f"Error enhancing image: {e}")
            return img

    def _save_temp_image(self, img: np.ndarray) -> str:
        """Save temporary image for processing"""
        try:
            if not self.temp_directory:
                self.temp_directory = os.path.join(settings.MEDIA_ROOT, f'temp_session_{self.channel_name}')
                os.makedirs(self.temp_directory, exist_ok=True)
            
            temp_filename = f"frame_{os.urandom(4).hex()}.jpg"
            temp_path = os.path.join(self.temp_directory, temp_filename)
            
            cv2.imwrite(temp_path, img)
            return temp_path
            
        except Exception as e:
            logger.error(f"Error saving temporary image: {e}")
            return None

    def _draw_recognition_box(self, img, name, x, y, w, h, color, confidence=None):
        """Draw recognition box with name and confidence"""
        try:
            # Draw rectangle
            cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)
            
            # Prepare text
            text = name if confidence is None else f"{name} ({confidence:.2f})"
            font = cv2.FONT_HERSHEY_DUPLEX
            font_scale = 0.6
            thickness = 1
            
            # Get text size
            (text_w, text_h), baseline = cv2.getTextSize(text, font, font_scale, thickness)
            
            # Draw text background
            cv2.rectangle(img, (x, y - text_h - 10), (x + text_w, y), color, -1)
            
            # Draw text
            cv2.putText(img, text, (x + 5, y - 5), font, font_scale, (255, 255, 255), thickness)
            
        except Exception as e:
            logger.error(f"Error drawing recognition box: {e}")

    @sync_to_async
    def prepare_face_recognition_db(self):
        """Prepare face recognition database from enrolled students"""
        try:
            # Get course and enrolled students
            course = Course.objects.prefetch_related('students').get(id=self.course_id)
            
            # Check user permission
            if course.teacher != self.user:
                logger.warning(f"User {self.user.id} attempted to access course {self.course_id} without permission")
                return False
            
            students_with_photos = course.students.filter(
                profile_photo__isnull=False
            ).exclude(profile_photo='')
            
            if not students_with_photos.exists():
                logger.warning(f"No students with photos found for course {self.course_id}")
                return False
            
            # Extract face encodings for each student
            for student in students_with_photos:
                if student.profile_photo and hasattr(student.profile_photo, 'path') and os.path.exists(student.profile_photo.path):
                    # Try to get from cache first
                    cache_key = f"face_encoding_{student.id}_{student.profile_photo.name}"
                    encoding = cache.get(cache_key)
                    
                    if encoding is None:
                        # Extract encoding
                        encoding = face_recognition_service.extract_face_encodings(student.profile_photo.path)
                        if encoding is not None:
                            # Cache for 1 hour
                            cache.set(cache_key, encoding, 3600)
                    
                    if encoding is not None:
                        self.known_faces_cache[f"student_{student.id}"] = encoding
            
            if not self.known_faces_cache:
                logger.warning(f"Could not extract face encodings for course {self.course_id}")
                return False
            
            logger.info(f"Prepared face recognition DB with {len(self.known_faces_cache)} students for course {self.course_id}")
            return True
            
        except Course.DoesNotExist:
            logger.error(f"Course {self.course_id} not found")
            return False
        except Exception as e:
            logger.error(f"Error preparing face recognition database: {e}")
            return False

    @sync_to_async
    def cleanup_resources(self):
        """Clean up temporary resources"""
        try:
            # Clean up temporary directory
            if hasattr(self, 'temp_directory') and self.temp_directory and os.path.exists(self.temp_directory):
                shutil.rmtree(self.temp_directory)
            
            # Clear memory caches
            self.known_faces_cache.clear()
            self.session_recognized_students.clear()
            self.session_sighting_counts.clear()
            
        except Exception as e:
            logger.error(f"Error cleaning up resources: {e}")

    @staticmethod
    @sync_to_async
    def mark_student_present(student_id: int, course_id: int):
        """Mark student as present for today"""
        try:
            record, created = AttendanceRecord.objects.get_or_create(
                student_id=student_id,
                course_id=course_id,
                timestamp__date=timezone.now().date(),
                defaults={'timestamp': timezone.now(), 'is_present': True}
            )
            
            if created:
                logger.info(f"Marked student {student_id} present for course {course_id}")
            
            return record
            
        except Exception as e:
            logger.error(f"Error marking student {student_id} present: {e}")
            return None