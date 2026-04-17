import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
import csv
import glob
import numpy as np

# --- CONFIGURATION ---
IMAGE_DIR = "dataset/train/images"
LABEL_DIR = "dataset/train/labels"
OUTPUT_CSV = "isl_landmarks_2handed.csv"
MODEL_PATH = "training/hand_landmarker.task"

# Classes from your data.yaml
CLASS_NAMES = ['brother', 'daughter', 'father', 'food', 'good', 'hello', 'here', 'how', 'morning', 'mother', 'night', 'no', 'nothing', 'ready', 'run', 'small', 'son', 'sorry', 'stop', 'thank you', 'what', 'when', 'where', 'which', 'who', 'why', 'you']

# Initialize MediaPipe Tasks Landmarker
base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.HandLandmarkerOptions(
    base_options=base_options,
    num_hands=2,
    min_hand_detection_confidence=0.5
)
detector = vision.HandLandmarker.create_from_options(options)

def extract_landmarks(image_path):
    img = cv2.imread(image_path)
    if img is None: return None
    
    # Convert to MediaPipe Image object
    mp_image = mp.Image.create_from_file(image_path)
    
    # Detect landmarks
    results = detector.detect(mp_image)
    
    full_landmarks = []
    
    if results.hand_landmarks:
        # Sort hands by X to keep Left/Right consistency
        # We look at the first landmark (wrist) of each hand for sorting
        hand_data = []
        for i in range(len(results.hand_landmarks)):
            hand_data.append(results.hand_landmarks[i])
            
        sorted_hands = sorted(hand_data, key=lambda x: x[0].x)
        
        for i in range(2):
            if i < len(sorted_hands):
                hand = sorted_hands[i]
                # Wrist landmarks
                base_x, base_y, base_z = hand[0].x, hand[0].y, hand[0].z
                for lm in hand:
                    full_landmarks.extend([lm.x - base_x, lm.y - base_y, lm.z - base_z])
            else:
                # Pad with 63 zeros for the missing hand
                full_landmarks.extend([0.0] * 63)
        return full_landmarks
    return None

def main():
    if not os.path.exists(IMAGE_DIR):
        print(f"Error: Could not find image directory: {IMAGE_DIR}")
        return

    print(f"Initializing Modern AI Extractor for {len(CLASS_NAMES)} Signs...")
    
    with open(OUTPUT_CSV, mode='w', newline='') as f:
        csv_writer = csv.writer(f)
        
        image_files = glob.glob(os.path.join(IMAGE_DIR, "*.jpg"))
        print(f"Found {len(image_files)} training samples.")
        
        success_count = 0
        
        for i, img_path in enumerate(image_files):
            base_name = os.path.basename(img_path).replace(".jpg", ".txt")
            label_path = os.path.join(LABEL_DIR, base_name)
            
            if not os.path.exists(label_path): continue
            
            with open(label_path, 'r') as lf:
                line = lf.readline()
                if not line: continue
                class_id = int(line.split()[0])
                label_name = CLASS_NAMES[class_id]
            
            print(f"[{i+1}/{len(image_files)}] Analyzing {label_name}...", end="\r")
            landmarks = extract_landmarks(img_path)
            
            if landmarks:
                csv_writer.writerow([label_name] + landmarks)
                success_count += 1
            
        print(f"\n\nExtraction Complete!")
        print(f"Successfully processed {success_count} vectors.")
        print(f"Dataset Generated: {OUTPUT_CSV}")

if __name__ == "__main__":
    main()
