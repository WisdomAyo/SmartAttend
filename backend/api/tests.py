# test_face_match.py (Revised for Professional Diagnostics)

import os
import shutil
import cv2
from deepface import DeepFace

# ---- CONFIGURATION ----
# Ensure this configuration EXACTLY matches your consumers.py
MODEL_NAME = "Facenet"
DISTANCE_METRIC = "euclidean_l2"
THRESHOLD = 1.0

# --- PATHS ---
# Make sure the paths are correct relative to where you run the script
TEST_IMAGE_PATH = "media/wisdom.jpg"
PROFILE_PHOTO_DIR = "media/student_photos" 

# ---- 1. PRE-RUN VALIDATION ----
print("--- 1. Validating Paths and Files ---")
assert os.path.exists(TEST_IMAGE_PATH), f"❌ Test image not found at: {os.path.abspath(TEST_IMAGE_PATH)}"
print(f"✅ Test image found: {os.path.abspath(TEST_IMAGE_PATH)}")
assert os.path.exists(PROFILE_PHOTO_DIR), f"❌ Database directory not found at: {os.path.abspath(PROFILE_PHOTO_DIR)}"
print(f"✅ Database directory found: {os.path.abspath(PROFILE_PHOTO_DIR)}")
print("-" * 30)

# ---- 2. CLEANUP OLD CACHE ----
# Remove the cached embeddings file to ensure a fresh test every time
embeddings_cache_file = os.path.join(PROFILE_PHOTO_DIR, "representations_facenet.pkl")
if os.path.exists(embeddings_cache_file):
    os.remove(embeddings_cache_file)
    print("--- 2. Cleaned up old cache file ---")
    print(f"✅ Removed: {embeddings_cache_file}")
    print("-" * 30)

# ---- 3. INPUT IMAGE PRE-FLIGHT CHECK ----
print("--- 3. Checking Test Image Quality ---")
try:
    # Try to detect a face in the input image. If this fails, the image is the problem.
    face_objects = DeepFace.extract_faces(
        img_path=TEST_IMAGE_PATH,
        enforce_detection=True # We MUST find a face here
    )
    print(f"✅ Face detected successfully in '{TEST_IMAGE_PATH}'. Image is usable.")
except ValueError as e:
    print(f"❌ CRITICAL FAILURE: Could not detect a face in the test image.")
    print(f"   Error: {e}")
    print(f"   SOLUTION: Use a clearer, more frontal photo for '{TEST_IMAGE_PATH}'.")
    exit() # Exit the script if the input image is bad
print("-" * 30)

# ---- 4. RUN THE RECOGNITION TEST ----
print("--- 4. Running Face Recognition ---")
print(f"   Model: {MODEL_NAME}, Metric: {DISTANCE_METRIC}, Threshold: {THRESHOLD}")

try:
    # This is the main test, now using the correct parameters
    results = DeepFace.find(
        img_path=TEST_IMAGE_PATH,
        db_path=PROFILE_PHOTO_DIR,
        model_name=MODEL_NAME,
        distance_metric=DISTANCE_METRIC,
        enforce_detection=False, # We already verified detection, so this is safe
        threshold=THRESHOLD
    )

    # ---- 5. DISPLAY & INTERPRET RESULTS ----
    print("\n--- 5. Results ---")
    if not results or results[0].empty:
        print("❌ FAILURE: No match was found.")
        print("\n   Possible Reasons & Next Steps:")
        print("   1. Image Quality: The person in the test photo looks very different from the profile photo (e.g., glasses, lighting, extreme angle).")
        print("   2. Threshold Too Strict: The calculated distance might be slightly above your threshold. Check the console for any 'distance' values if a face was detected but not matched.")
        print("   3. Wrong Person: The images are of two different people.")
    else:
        # DeepFace returns a list of DataFrames, one for each face found in the test image.
        # We only expect one face, so we process the first DataFrame.
        df = results[0]
        if not df.empty:
            print("✅ SUCCESS: A match was found!")
            print(df[['identity', 'distance']])
            
            # Provide interpretation
            distance = df.iloc[0]['distance']
            print(f"\n   Interpretation: The lowest distance found was {distance:.4f}.")
            if distance <= THRESHOLD:
                print("   This is within the threshold, so your matching logic is working correctly!")
            else:
                 print("   ⚠️ This is strange, as DeepFace should have filtered this out. There may be a version inconsistency.")
        else:
             print("❌ FAILURE: A face was detected in the test image, but it did not match any profile photos within the threshold.")

except Exception as e:
    print(f"💥 An unexpected error occurred during the DeepFace.find call: {e}")
    import traceback
    traceback.print_exc()