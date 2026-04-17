# ASTRA Sign AI

ASTRA Sign AI (also known as SignSpeak AI) is a comprehensive web-based sign language translator platform. It leverages state-of-the-art hand gesture recognition via webcam to instantly convert sign language into both text and speech in real time. 

## Features

- **Real-Time Vision Translator**: Translates sign language through the webcam with zero latency using advanced AI algorithms (MediaPipe).
- **Voice Synthesis**: Automatically speaks out the detected signs using Text-To-Speech (pyttsx3).
- **Secure Archive & Vault**: Automatically logs and archives your communication sessions safely locally.
- **WebRTC Video Calls**: Includes a P2P signaling server for hosting sign-language integrated video calls.
- **Dual-Hand Tracking**: Advanced gesture recognition handling single and dual-hand signs.

## Project Structure

- `app.py`: The main Vision Mode execution script. Runs the offline/fallback translation using OpenCV and MediaPipe.
- `video-call/`: The WebRTC Sign Language AI integration platform. 
  - `server/`: Node.js signaling server.
  - `client/`: Web interface for video calls.
- `dataset/`: Training Data and YOLO/MediaPipe markers.
- `training/`: AI model training scripts and data preparation for custom models.

## How to Run

**1. Vision Translator (Local UI)**
```bash
pip install -r requirements.txt
streamlit run app.py
```

**2. Video Call Web Application**
```bash
# Terminal 1: Start the signaling server
cd video-call/server
npm install
npm start

# Terminal 2: Run the frontend
# You can serve the 'client' directory using any HTTP server:
cd video-call/client
npx serve . 
```
