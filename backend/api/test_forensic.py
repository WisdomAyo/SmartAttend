# test_forensic_match.py (The Final Diagnostic)

import os
import numpy as np
from scipy.spatial import distance
from deepface import DeepFace

# ---- CONFIGURATION ----
# IMPORTANT: Provide the direct path to your test image and the ONE
# correct profile photo it is supposed to match.

TEST_IMAGE_PATH = "media/wisdom.jpg"
CORRECT_PROFILE_PHOTO_PATH = "media/student_photos/3545452_365b0782.jpeg" # <-- CHANGE THIS

# ---- VALIDATION ----
print("--- Forensic Match Test ---")
assert os.path.exists(TEST_IMAGE_PATH), f"❌ Test image not found: {TEST_IMAGE_PATH}"
assert os.path.exists(CORRECT_PROFILE_PHOTO_PATH), f"❌ Correct profile photo not found: {CORRECT_PROFILE_PHOTO_PATH}"
print("✅ Both image files found. Proceeding to generate embeddings.")
print("-" * 30)

# ---- GENERATE EMBEDDINGS ----
# This function, `represent`, is the core of DeepFace. It turns a face into a list of numbers (a vector).
try:
    print(f"Generating embedding for Test Image: '{TEST_IMAGE_PATH}'...")
    test_embedding = DeepFace.represent(
        img_path=TEST_IMAGE_PATH,
        model_name="Facenet",
        enforce_detection=True
    )[0]["embedding"]
    print("✅ Embedding generated for test image.")

    print(f"Generating embedding for Profile Photo: '{CORRECT_PROFILE_PHOTO_PATH}'...")
    profile_embedding = DeepFace.represent(
        img_path=CORRECT_PROFILE_PHOTO_PATH,
        model_name="Facenet",
        enforce_detection=True
    )[0]["embedding"]
    print("✅ Embedding generated for profile photo.")
    print("-" * 30)

except ValueError as e:
    print(f"❌ CRITICAL FAILURE: Could not detect a face in one of the images.")
    print(f"   Error: {e}")
    print("   SOLUTION: Ensure both photos are clear, frontal, and contain only one face.")
    exit()

# ---- CALCULATE DISTANCE MANUALLY ----
print("--- Calculating Distance ---")
# Euclidean L2 Distance (used by your consumer.py)
l2_distance = np.linalg.norm(np.array(test_embedding) - np.array(profile_embedding))

# Cosine Distance (another common metric, for a second opinion)
cosine_distance = distance.cosine(test_embedding, profile_embedding)

# ---- INTERPRETATION ----
print("\n--- RESULTS ---")
print(f"Calculated Euclidean L2 Distance: {l2_distance:.4f}")
print(f"Calculated Cosine Distance:        {cosine_distance:.4f}")
print("-" * 30)

print("--- INTERPRETATION ---")
print("For the 'Facenet' model:")
print("  - A good match should have an L2 Distance LESS THAN 1.1")
print("  - A good match should have a Cosine Distance LESS THAN 0.4")
print("-" * 30)

# Final Verdict
if l2_distance <= 1.1:
    print("✅ VERDICT: These two images ARE of the same person.")
    print("   This proves the model itself is working.")
    print("   The problem is 100% within the `DeepFace.find` function or its caching mechanism in the live app.")
else:
    print("❌ VERDICT: These two images are NOT a match.")
    print("   This means the images are genuinely too different for the model to consider them the same person.")
    print("   Possible Reasons:")
    print("     1. They are actually different people.")
    print("     2. The lighting, angle, or expression is dramatically different.")
    print("     3. One of the images is very low quality.")
    print("   SOLUTION: Try again with a new, very clear profile picture for this student.")