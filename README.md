# ASTRA Sign AI: Vision Mode

**ASTRA Sign AI** is a web-based, real-time sign language translator that utilizes webcam hand gesture recognition to instantly convert signs into text and synthesized speech. No specialized hardware or gloves are needed!

## Features

- **Real-Time Translation**: Uses advanced computer vision (MediaPipe/OpenCV) to detect hand landmarks and match them with predefined signs.
- **Voice Synthesis**: Automatically speaks out translated words using `pyttsx3`, enabling seamless communication.
- **Secure Archive & Vision Vault**: Capable of saving camera session logs visually as MP4 files inside a secure, PIN-protected archive accessible directly from the app interface.
- **Web App Ready**: Powered by Streamlit for a fast, responsive, and beautiful user interface.
- **Fallback Simulation Mode**: Gracefully handles missing detection dependencies for broader compatibility.

## Tech Stack

- **Python 3**
- **Streamlit** (Frontend/Web Server)
- **OpenCV** (Camera Feed & Video Writing)
- **MediaPipe** (Hand Landmark Detection)
- **Pyttsx3** (Text-to-Speech)

## Setup & Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Siddu-24/TR-057-Debuggers.git
   cd TR-057-Debuggers
   ```

2. Install the necessary dependencies:
   ```bash
   pip install streamlit opencv-python mediapipe pyttsx3 Pillow numpy
   ```

3. Run the application:
   ```bash
   streamlit run app.py
   ```

## Usage
- Open the provided Streamlit local URL.
- Toggle the **"Turn On Camera"** option.
- Perform signs in front of the camera (e.g., "Hello", "Peace", "Thank You", "I Love You", "Stop", depending on the mappings).
- The detected word will automatically be translated onscreen and voiced aloud!
