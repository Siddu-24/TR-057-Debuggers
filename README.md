# 🖐️ SignSpeak AI — Flagship ISL Video Bridge

> **Voices for the Silent.** A real-time P2P video conferencing platform that translates Indian Sign Language (ISL) into natural speech using AI-powered hand gesture recognition.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.6.1-black.svg)](https://socket.io/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-orange.svg)](https://mediapipe.dev/)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-000?logo=vercel)](https://vercel.com/)
[![Deployed on Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://render.com/)

---

## 📖 Overview

**SignSpeak AI** is a full-stack, browser-based real-time communication platform designed to bridge the gap between sign language users and non-signers. Using **WebRTC** for peer-to-peer video and **Google MediaPipe Hands** for gesture recognition, the platform detects Indian Sign Language gestures live from the user's webcam and instantly translates them into synthesized speech — no dedicated software or hardware required.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤝 **P2P Video Calling** | Direct WebRTC peer connection via Simple-Peer for ultra-low latency video |
| 🧠 **AI Gesture Recognition** | Real-time ISL hand landmark detection using MediaPipe Hands |
| 🔊 **Voice Synthesis** | Recognized signs are converted to spoken text via Web Speech API |
| 🔐 **User Authentication** | JWT-based login/register system with bcrypt password hashing |
| 📜 **Intelligence Log** | Live transcript of detected signs during a session |
| 💾 **Session Export** | Download session transcript as a CSV file |
| 🎓 **Sign Studio** | Map custom gestures and expand the platform's sign vocabulary |
| 🗄️ **Vision Archive** | Secure admin-protected portal to view and export historical vision logs |
| 📹 **Media Controls** | Toggle mic, camera, and fullscreen mode in-call |
| 🔑 **Credential Recovery** | OTP-based password reset flow |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│                                                                  │
│  ┌─────────────────┐    ┌──────────────────────────────────┐    │
│  │  index.html +   │    │         app.js (Logic)           │    │
│  │  styles.css     │    │  MediaPipe Hands → Gesture Map   │    │
│  │  (UI Layer)     │    │  WebRTC (Simple-Peer) ← Socket   │    │
│  └─────────────────┘    │  Web Speech API (TTS)            │    │
│                         └──────────────────────────────────┘    │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ WebSocket (Socket.IO)
                    ┌─────────────▼─────────────┐
                    │   Node.js Signaling Server  │
                    │        (Express)            │
                    │                             │
                    │  ● WebRTC Signal Relay      │
                    │  ● JWT Auth (login/register)│
                    │  ● OTP Credential Reset     │
                    │  ● Session Recording Mgmt   │
                    │  ● SQLite User Database     │
                    └─────────────────────────────┘
```

**Deployment Split:**
- **Frontend** → Hosted on **Vercel** (static files: `video-call/client/`)
- **Backend** → Hosted on **Render** (Node.js server: `video-call/server/`)

---

## 🗂️ Project Structure

```
hand-gesture/
├── 📁 video-call/
│   ├── 📁 client/              # Frontend (Vercel)
│   │   ├── index.html          # Main UI — Auth portal, video call, sign studio
│   │   ├── app.js              # Core logic — WebRTC, MediaPipe, gesture map, auth
│   │   └── styles.css          # Glassmorphism dark-mode design system
│   │
│   └── 📁 server/              # Backend (Render)
│       ├── index.js            # Express + Socket.IO signaling server
│       ├── package.json        # Node.js dependencies
│       └── users.db            # SQLite database (auto-created)
│
├── 📁 vision_vault/            # Server-side session recordings storage
├── render.yaml                 # Render deployment configuration
├── vercel.json                 # Vercel routing configuration
├── run.bat                     # One-click local startup script (Windows)
└── README.md
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| HTML5 / CSS3 / Vanilla JS | Core UI structure and logic |
| [MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) | Real-time hand landmark detection (21 keypoints) |
| [Simple-Peer](https://github.com/feross/simple-peer) | WebRTC abstraction for P2P video |
| [Socket.IO Client](https://socket.io/) | WebSocket signaling channel |
| Web Speech API | Text-to-speech voice synthesis |
| Google Fonts (Outfit) | Modern typography |

### Backend
| Technology | Purpose |
|---|---|
| [Node.js](https://nodejs.org/) `v20` | Runtime environment |
| [Express.js](https://expressjs.com/) | HTTP server and REST API |
| [Socket.IO](https://socket.io/) | Real-time WebSocket server for WebRTC signaling |
| [SQLite3](https://www.npmjs.com/package/sqlite3) | Lightweight user database |
| [JWT](https://www.npmjs.com/package/jsonwebtoken) | Stateless authentication tokens |
| [bcryptjs](https://www.npmjs.com/package/bcryptjs) | Secure password hashing |
| [Multer](https://www.npmjs.com/package/multer) | Session recording file uploads |
| [CORS](https://www.npmjs.com/package/cors) | Cross-origin resource sharing |

---

## 🚀 Getting Started (Local)

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- A modern browser with webcam access (Chrome recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/Siddu-24/TR-057-Debuggers.git
cd TR-057-Debuggers
```

### 2. Install Server Dependencies

```bash
cd video-call/server
npm install
```

### 3. Start the Signaling Server

```bash
node index.js
# Server starts at http://localhost:5000
```

> **Windows shortcut:** Run `run.bat` from the root directory.

### 4. Open the Frontend

Open `video-call/client/index.html` directly in your browser, or serve it with a local server:

```bash
# Using VS Code Live Server, or:
npx serve video-call/client
```

### 5. Test a Call (Two Users)

- Open the app in **two browser tabs** or **two devices** on the same network.
- Register/Login on both.
- One user copies their **Contact ID** and shares it.
- The other pastes it in **Direct Connection** and clicks **Connect to Contact**.

---

## ☁️ Deployment

### Frontend → Vercel

The `vercel.json` file routes all traffic to the `video-call/client/` directory.

```bash
# Deploy via Vercel CLI
vercel --prod
```

Or connect the GitHub repository to [vercel.com](https://vercel.com) and it will auto-deploy.

### Backend → Render

The `render.yaml` file configures the Node.js web service.

```yaml
services:
  - type: web
    name: signspeak-server
    env: node
    rootDir: video-call/server
    buildCommand: npm install
    startCommand: npm start
```

> **Important:** After deploying the backend on Render, update the Socket.IO server URL in `video-call/client/app.js` to point to your Render service URL.

---

## 🌐 Live Demo

| Service | URL |
|---|---|
| 🌍 Frontend | [Deployed on Vercel](#) |
| ⚙️ Backend | [Deployed on Render](#) |

---

## 📡 How It Works

```
1. User opens the app → Authenticates via JWT login
2. Socket.IO connects to signaling server → Assigned a unique socket ID
3. User A shares their ID with User B
4. User B initiates a call → WebRTC offer/answer exchange via Socket.IO
5. P2P video stream established (Simple-Peer / WebRTC)
6. MediaPipe processes User A's webcam frames (browser-side, no server round-trip)
7. Detected hand landmarks → matched against ISL gesture vocabulary
8. Recognized sign → displayed on translation bar + spoken via Web Speech API
9. Sign name sent to User B via WebRTC data channel for their display
10. Session transcript saved locally and exportable as CSV
```

---

## ✋ Supported ISL Signs

The platform includes a built-in vocabulary of common ISL gestures including:

- **Greetings:** Hello, Namaste, Thank You, Please
- **Basics:** Yes, No, Help, Stop, More, Again
- **Numerals:** 1–5 (single-hand counting)
- **Custom Signs:** Use the **Sign Studio** to map any gesture to a custom label

---

## 🔒 Security

- Passwords hashed with **bcrypt** (salt rounds: 10)
- Sessions authenticated via **JWT** tokens (signed, expiry-controlled)
- Admin archive protected by a **PIN gate**
- OTP-based credential recovery flow

---

## 🤝 Team — TR-057 Debuggers

> Built for hackathon competition under the **ASTRA Sign AI** initiative.

| Role | Responsibility |
|---|---|
| Full-Stack Dev | WebRTC signaling, Node.js backend, Socket.IO |
| AI/ML Engineer | MediaPipe gesture engine, ISL sign vocabulary |
| UI/UX Designer | Glassmorphism design system, CSS animations |
| DevOps | Vercel + Render deployment, CI/CD configuration |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**🖐️ SignSpeak AI** — *Giving voice to every hand.*

Made with ❤️ by **Team TR-057 Debuggers**

</div>
