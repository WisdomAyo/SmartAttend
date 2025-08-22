import numpy as np
from deepface import DeepFace
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class FaceRecognitionService:
    """
    Service for extracting and matching face encodings.
    """

    def extract_face_encodings(self, image_path: str) -> Optional[np.ndarray]:
        """
        Extract face embeddings using DeepFace for a given image path.
        Returns the vector or None if detection fails.
        """
        try:
            embedding_obj = DeepFace.represent(
                img_path=image_path,
                model_name='VGG-Face',
                enforce_detection=False
            )
            if embedding_obj and isinstance(embedding_obj, list):
                return embedding_obj[0]["embedding"]
        except Exception as e:
            logger.error(f"Failed to extract face encoding from {image_path}: {e}")
        return None

    def find_faces_in_image(self, test_image_path: str, known_faces: Dict[str, List[float]]) -> List[Dict[str, str]]:
        """
        Compare test image to known faces using DeepFace verify.
        Returns list of matches.
        """
        results = []
        for student_id, encoding in known_faces.items():
            try:
                verification_result = DeepFace.verify(
                    img1_path=test_image_path,
                    img2_path=None,  # Use embedding instead
                    model_name='VGG-Face',
                    distance_metric='cosine',
                    enforce_detection=False,
                    img2_representation=encoding
                )

                if verification_result.get('verified'):
                    results.append({
                        "student_id": student_id,
                        "distance": verification_result.get('distance'),
                        "model": verification_result.get('model'),
                        "threshold": verification_result.get('threshold')
                    })
            except Exception as e:
                logger.warning(f"Verification failed for student {student_id}: {e}")
        return results

    def validate_face_image(self, image_path):
        """
        Validates if a single, clear face is present in the image.
        """
        try:
            # The `represent` function with `enforce_detection=True` will raise an exception
            # if no face is detected or if multiple faces are detected.
            face_objs = DeepFace.represent(
                img_path=image_path,
                model_name='VGG-Face',
                enforce_detection=True  # Strict validation
            )
            
            # The result should be a list containing one dictionary
            if isinstance(face_objs, list) and len(face_objs) == 1:
                return {
                    "valid": True,
                    "message": "A single clear face was detected.",
                    "face_count": 1,
                    "embedding": face_objs[0]['embedding']
                }
            else:
                # This case might be redundant due to enforce_detection=True, but it's good for safety
                return {
                    "valid": False,
                    "error": "Multiple faces detected.",
                    "face_count": len(face_objs) if isinstance(face_objs, list) else 0
                }

        except ValueError as e:
            # DeepFace raises ValueError for no face or multiple faces
            error_message = str(e)
            if "Face could not be detected" in error_message:
                return {"valid": False, "error": "No face detected in the image."}
            elif "more than one face" in error_message:
                return {"valid": False, "error": "Multiple faces detected in the image."}
            else:
                return {"valid": False, "error": f"An unexpected validation error occurred: {e}"}
        except Exception as e:
            logger.error(f"Error during face validation for {image_path}: {e}")
            return {"valid": False, "error": "An internal error occurred during face validation."}
            
face_recognition_service = FaceRecognitionService()