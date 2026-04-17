import streamlit as st
import cv2
# import mediapipe as mp (Replaced by specific sub-module imports below)
import pyttsx3
import time
from PIL import Image
import numpy as np
import os
import datetime

# --- Page Config ---
st.set_page_config(
    page_title="SignSpeak AI - Vision Mode",
    page_icon="👁️",
    layout="wide",
)

# --- Styling ---
st.markdown("""
    <style>
    .stApp {
        background-color: #0e1117;
    }
    .word-box {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        padding: 30px;
        border-radius: 15px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
    }
    .translated-text {
        font-size: 64px;
        font-weight: 800;
        color: #00ffcc;
        text-shadow: 0 0 10px #00ffcc;
        margin: 20px 0;
    }
    </style>
""", unsafe_allow_html=True)

# --- Initialization ---
if 'history' not in st.session_state:
    st.session_state.history = []
if 'last_word' not in st.session_state:
    st.session_state.last_word = ""
if 'vault_unlocked' not in st.session_state:
    st.session_state.vault_unlocked = False

# Ensure vault directory exists
VAULT_DIR = "vision_vault"
if not os.path.exists(VAULT_DIR):
    os.makedirs(VAULT_DIR)

# TTS
engine = pyttsx3.init()
engine.setProperty('rate', 150)

def speak(text):
    engine.say(text)
    engine.runAndWait()

# MediaPipe Setup with Graceful Fallback & IDE Warning Suppression
HAS_MEDIAPIPE = False
try:
    import mediapipe.solutions.hands as mp_hands # type: ignore
    import mediapipe.solutions.drawing_utils as mp_draw # type: ignore
    hands = mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.7, min_tracking_confidence=0.5)
    HAS_MEDIAPIPE = True
except (ImportError, AttributeError):
    # Hide error details unless in debug mode, just set a flag
    hands = None
    mp_hands = None
    mp_draw = None

if not HAS_MEDIAPIPE:
    st.warning("⚠️ AI Tracking is currently in Simulation Mode (Python 3.13 Compatibility).")
    st.info("💡 For live camera tracking, please use the **Web Version**: [http://localhost:8080](http://localhost:8080)")

SIGN_MAP = {
    (0, 1, 0, 0, 0): "HELLO",
    (0, 1, 1, 0, 0): "PEACE",
    (1, 1, 1, 1, 1): "THANK YOU",
    (1, 0, 0, 0, 1): "I LOVE YOU",
    (0, 1, 1, 1, 1): "STOP",
}

def get_finger_status(hand_landmarks):
    tip_ids = [8, 12, 16, 20]
    fingers = []
    # Thumb (simple horizontal check)
    if hand_landmarks.landmark[4].x < hand_landmarks.landmark[3].x:
        fingers.append(1)
    else:
        fingers.append(0)
    # 4 fingers
    for tid in tip_ids:
        if hand_landmarks.landmark[tid].y < hand_landmarks.landmark[tid - 2].y:
            fingers.append(1)
        else:
            fingers.append(0)
    return tuple(fingers)

# --- Layout ---
st.title("👁️ SignSpeak AI: Vision Translator")
st.write("Using your webcam to translate sign language in real-time. No gloves needed.")

col1, col2 = st.columns([2, 1])

with col1:
    st.write("### Live Webcam Feed")
    run_cv = st.checkbox("Turn On Camera", value=True)
    WEBCAM_PLACEHOLDER = st.empty()

with col2:
    st.write("### Current Translation")
    word_placeholder = st.empty()
    st.write("### History")
    history_placeholder = st.empty()

# --- Vision Vault Sidebar ---
st.sidebar.title("🔐 Secure Archive")
secret_code = st.sidebar.text_input("Enter Secret Code", type="password")
if secret_code == "1234": # Secret Code
    st.session_state.vault_unlocked = True
    st.sidebar.success("Vault Unlocked")
else:
    st.session_state.vault_unlocked = False
    if secret_code: st.sidebar.error("Invalid Code")

if st.session_state.vault_unlocked:
    st.sidebar.write("### Recorded Sessions")
    files = sorted(os.listdir(VAULT_DIR), reverse=True)
    for f in files:
        if f.endswith(".mp4"):
            if st.sidebar.button(f"View {f[:16]}"):
                st.session_state.selected_video = f

# --- Main CV Loop ---
if run_cv:
    cap = cv2.VideoCapture(0)
    
    # Initialize recorder with first frame size
    ret, first_frame = cap.read()
    if ret:
        h, w = first_frame.shape[:2]
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        out_path = os.path.join(VAULT_DIR, f"vision_log_{timestamp}.mp4")
        out = cv2.VideoWriter(out_path, fourcc, 20.0, (w, h))
    else:
        out = None
    
    last_speak_time = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            st.error("Could not access camera.")
            break
            
        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        current_word = "WAITING"

        if HAS_MEDIAPIPE and hands:
            results = hands.process(rgb_frame)
            if results.multi_hand_landmarks:
                for hand_lms in results.multi_hand_landmarks:
                    if mp_draw:
                        mp_draw.draw_landmarks(frame, hand_lms, mp_hands.HAND_CONNECTIONS)
                    gesture = get_finger_status(hand_lms)
                current_word = SIGN_MAP.get(gesture, "UNKNOWN")
                
                if current_word in SIGN_MAP and current_word != st.session_state.last_word:
                    if time.time() - last_speak_time > 2:
                        speak(current_word)
                        st.session_state.last_word = current_word
                        st.session_state.history.append(current_word)
                        last_speak_time = time.time()

        # Save to Vault
        if out:
            out.write(frame)

        # Display Frame in Streamlit
        WEBCAM_PLACEHOLDER.image(frame, channels="BGR", use_column_width=True)
        
        # Update UI Elements
        word_placeholder.markdown(f"""
            <div class="word-box">
                <p style="color:#888">Detected Sign</p>
                <div class="translated-text">{current_word}</div>
            </div>
        """, unsafe_allow_html=True)
        
        history_placeholder.write(st.session_state.history[-10:])
        
        if not run_cv:
            break
    cap.release()
    out.release()
else:
    st.info("Turn on the 'Turn On Camera' checkbox to start translating.")

# --- Vault Video Player ---
if st.session_state.vault_unlocked and 'selected_video' in st.session_state:
    st.divider()
    st.write(f"### Playing: {st.session_state.selected_video}")
    video_file = open(os.path.join(VAULT_DIR, st.session_state.selected_video), 'rb')
    video_bytes = video_file.read()
    st.video(video_bytes)
    if st.button("Close Player"):
        del st.session_state.selected_video
        st.rerun()
