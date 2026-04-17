import cv2
import mediapipe as mp
import pyttsx3
import time

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.5
)
mp_draw = mp.solutions.drawing_utils

# Initialize TTS
engine = pyttsx3.init()
engine.setProperty('rate', 150)

def speak(text):
    print(f"Speaking: {text}")
    engine.say(text)
    engine.runAndWait()

# Sign Mapping (Extended fingers: Thumb, Index, Middle, Ring, Pinky)
SIGN_MAP = {
    (0, 1, 0, 0, 0): "HELLO",
    (0, 1, 1, 0, 0): "PEACE",
    (1, 1, 1, 1, 1): "THANK YOU",
    (1, 0, 0, 0, 1): "I LOVE YOU",
    (0, 1, 1, 1, 1): "STOP",
    (0, 0, 0, 0, 0): "WAITING"
}

def get_finger_status(hand_landmarks):
    # Tip IDs for Index, Middle, Ring, Pinky
    tip_ids = [8, 12, 16, 20]
    fingers = []

    # Thumb logic (horizontal comparison for horizontal hands)
    # Corrected: check if thumb tip is to the left/right of joint based on hand orientation
    # Simple heuristic: compare tip to joint 3
    if hand_landmarks.landmark[4].x < hand_landmarks.landmark[3].x:
        fingers.append(1)
    else:
        fingers.append(0)

    # 4 Fingers logic: tip above joint
    for tid in tip_ids:
        if hand_landmarks.landmark[tid].y < hand_landmarks.landmark[tid - 2].y:
            fingers.append(1)
        else:
            fingers.append(0)

    return tuple(fingers)

def main():
    cap = cv2.VideoCapture(0)
    last_word = ""
    last_speak_time = 0

    print("Camera-based Sign Translator Running...")
    
    while cap.isOpened():
        success, img = cap.read()
        if not success:
            continue

        # Flip image horizontally for a mirroring effect
        img = cv2.flip(img, 1)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = hands.process(img_rgb)

        if results.multi_hand_landmarks:
            for hand_lms in results.multi_hand_landmarks:
                mp_draw.draw_landmarks(img, hand_lms, mp_hands.HAND_CONNECTIONS)
                
                # Get the finger configuration
                gesture = get_finger_status(hand_lms)
                word = SIGN_MAP.get(gesture, "")

                if word and word != last_word and word != "WAITING":
                    # Speak with a small cooldown to avoid repetition
                    if time.time() - last_speak_time > 2:
                        speak(word)
                        last_word = word
                        last_speak_time = time.time()

                # Display text on screen
                cv2.putText(img, f'Sign: {word}', (10, 70), 
                           cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 255, 0), 3)

        cv2.imshow("SignSpeak - Camera Mode", img)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
