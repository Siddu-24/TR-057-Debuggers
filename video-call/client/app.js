const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : 'https://signspeak-server.onrender.com'; // REPLACE THIS LATER

// --- IDENTITY CONTROLLER (Auth Engine) ---
const Auth = {
    portal: document.getElementById('auth-portal'),
    loginView: document.getElementById('login-view'),
    registerView: document.getElementById('register-view'),
    resetView: document.getElementById('reset-view'),

    init() {
        // View Switching
        document.getElementById('go-to-register').onclick = () => this.switch('register');
        document.getElementById('go-to-reset').onclick = () => this.switch('reset');
        document.getElementById('back-to-login').onclick = () => this.switch('login');
        document.getElementById('reset-back-to-login').onclick = () => this.switch('login');

        // Logic Buttons
        document.getElementById('register-btn').onclick = () => this.action('register');
        document.getElementById('login-btn').onclick = () => this.action('login');
        document.getElementById('reset-btn').onclick = () => this.action('reset');
        document.getElementById('logout-btn').onclick = () => {
            localStorage.removeItem('unit_token');
            location.reload();
        };

        // OTP Trigger
        document.getElementById('send-otp-btn').onclick = async () => {
            const email = document.getElementById('reset-email').value;
            if (!email) return alert("Please specify the unit email.");
            
            const res = await fetch(BACKEND_URL + '/api/auth/request-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            
            if (data.success) {
                alert("Security Code Generated. Please verify in Terminal.");
                document.getElementById('otp-section').style.display = 'block';
                document.getElementById('send-otp-btn').style.display = 'none';
                document.getElementById('reset-btn').style.display = 'block';
            } else {
                alert(`Error: ${data.error}`);
            }
        };

        // Session Check
        const token = localStorage.getItem('unit_token');
        if (token) {
            this.portal.style.display = 'none';
            startApp(); // START ONLY IF LOGGED IN
        }
    },

    switch(view) {
        this.loginView.style.display = view === 'login' ? 'block' : 'none';
        this.registerView.style.display = view === 'register' ? 'block' : 'none';
        this.resetView.style.display = view === 'reset' ? 'block' : 'none';
        
        // Reset recovery state when switching back
        if (view === 'reset') {
            document.getElementById('otp-section').style.display = 'none';
            document.getElementById('send-otp-btn').style.display = 'block';
            document.getElementById('reset-btn').style.display = 'none';
        }
    },

    async action(type) {
        let endpoint, body;
        if (type === 'register') {
            endpoint = '/api/auth/register';
            body = { email: document.getElementById('reg-email').value, password: document.getElementById('reg-pass').value };
        } else if (type === 'login') {
            endpoint = '/api/auth/login';
            body = { email: document.getElementById('login-email').value, password: document.getElementById('login-pass').value };
        } else {
            endpoint = '/api/auth/reset';
            body = { 
                email: document.getElementById('reset-email').value, 
                otp: document.getElementById('reset-otp').value,
                newPassword: document.getElementById('reset-new-pass').value 
            };
        }

        try {
            const res = await fetch(BACKEND_URL + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (data.success) {
                if (type === 'login') {
                    localStorage.setItem('unit_token', data.token);
                    localStorage.setItem('unit_email', body.email); // Store email for tagging
                    this.portal.style.display = 'none';
                    startApp(); // START CAMERA AFTER LOGIN
                } else if (type === 'register') {
                    alert("Initialization Successful. Please Authorize Identity.");
                    this.switch('login');
                } else {
                    alert("Identity Re-initialized. Use new credentials.");
                    this.switch('login');
                }
            } else {
                alert(`Protocol Error: ${data.error}`);
            }
        } catch (e) {
            alert("Connection Barrier Encountered.");
        }
    }
};

Auth.init();

// --- SIGNSPEAK AI CORE - ULTIMATE ROBUST VERSION ---
console.log("SignSpeak Engine Script Loaded.");

// Auto-connect with optimized transports
let socket = null; 

// Global State
let me = null;
let peer = null;
let myStream = null;
let customVocabulary = JSON.parse(localStorage.getItem('isl_vocabulary')) || {};
let latestHandData = null;
const currentSessionId = `SESSION_${Date.now()}`;
let sessionTranscript = []; // Local cache for export

// Constant Mappings
const BASE_SIGNS = {
    '01000': 'HELLO',
    '01100': 'PEACE',
    '11111': 'THANK YOU',
    '10001': 'LOVE',
    '11110': 'STOP'
};

// --- RECORDING GLOBALS ---
let mediaRecorder; // For Calls
let localSessionRecorder; // For Passive Logging
let recordedChunks = [];
let localChunks = [];
let isRecordingPassive = false;

// --- CORE UTILS ---
const speak = (text) => {
    const toggle = document.getElementById('voice-toggle');
    if (toggle && toggle.checked) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.rate = 1.0;
        window.speechSynthesis.speak(msg);
    }
};

const updateStatus = (text, color = "#00f2fe") => {
    const bar = document.getElementById('output-text');
    if (bar) {
        bar.innerText = text;
        bar.style.color = color;
        bar.dataset.lastText = text; // Store for comparison
        
        // --- ADD TO INTELLIGENCE LOG ---
        if (color !== "red") { // Don't log errors
            addToIntelligenceLog(text);
            saveTranscriptToServer(text);
        }
    }
};

function addToIntelligenceLog(message) {
    const container = document.getElementById('transcript-container');
    if (!container) return;
    
    const timestamp = new Date().toLocaleTimeString();
    sessionTranscript.push({ time: timestamp, msg: message });

    const logEntry = document.createElement('div');
    logEntry.style.marginBottom = '5px';
    logEntry.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    logEntry.style.paddingBottom = '3px';
    logEntry.innerHTML = `<span style="opacity:0.4; font-size:0.6rem;">${new Date().toLocaleTimeString()}</span> <span style="color:var(--primary)">${message}</span>`;
    container.prepend(logEntry);
}

async function saveTranscriptToServer(message) {
    const token = localStorage.getItem('unit_token');
    if (!token) return;
    
    await fetch(BACKEND_URL + '/api/transcripts', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ message, session_id: currentSessionId })
    });
}

// --- INITIALIZATION ---
async function startApp() {
    console.log("Initializing Terminal Components...");
    
    // 1. DOM Element Cache
    const el = {
        myVideo: document.getElementById('my-video'),
        peerVideo: document.getElementById('peer-video'),
        canvas: document.getElementById('hands-canvas'),
        idDisplay: document.getElementById('my-id-display'),
        copyBtn: document.getElementById('copy-link-btn'),
        callBtn: document.getElementById('call-btn'),
        endBtn: document.getElementById('end-btn'),
        peerInput: document.getElementById('peer-id-input'),
        learnBtn: document.getElementById('learn-btn'),
        learnInput: document.getElementById('new-sign-name'),
        modal: document.getElementById('call-modal'),
        answerBtn: document.getElementById('answer-btn'),
        rejectBtn: document.getElementById('reject-btn')
    };

    // 2. Peer & Socket Setup
    try {
        if (!socket) {
            socket = io(BACKEND_URL); // Connect to Backend
        }
        socket.on('connect', () => console.log("Connected to Signaling Engine"));
        socket.on('me', id => {
            me = id;
            el.idDisplay.innerText = `Identity ID: ${id}`;
            updateStatus("System Live. Waiting for Gesture...");
        });
    } catch (err) {
        console.error("Socket Error:", err);
        updateStatus("ERROR: SIGNAL SERVER OFFLINE", "red");
    }

    // 3. Camera & Media Support
    try {
        myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        el.myVideo.srcObject = myStream;
    } catch (err) {
        console.error("Camera Error:", err);
        updateStatus("ERROR: CAMERA ACCESS DENIED", "red");
        return;
    }

    // 4. Vision Engine (MediaPipe)
    const setupVision = () => {
        const hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });

        hands.onResults((results) => {
            const ctx = el.canvas.getContext('2d');
            if (el.myVideo.videoWidth > 0 && el.canvas.width !== el.myVideo.videoWidth) {
                el.canvas.width = el.myVideo.videoWidth;
                el.canvas.height = el.myVideo.videoHeight;
            }

            latestHandData = results.multiHandLandmarks;
            ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                let currentSigns = [];
                results.multiHandLandmarks.forEach(lms => {
                    // Visual Feedback (Dots)
                    lms.forEach(pt => {
                        ctx.fillStyle = "#00f2fe";
                        ctx.beginPath();
                        ctx.arc(pt.x * el.canvas.width, pt.y * el.canvas.height, 3, 0, 2*Math.PI);
                        ctx.fill();
                    });

                    // Detection Logic
                    const pattern = getFingerPattern(lms);
                    const word = BASE_SIGNS[pattern] || customVocabulary[pattern];
                    if (word) currentSigns.push(word);
                });

                if (currentSigns.length > 0) {
                    const text = Array.from(new Set(currentSigns)).join(' + ');
                    const lastText = document.getElementById('output-text').dataset.lastText;
                    if (text !== lastText) {
                        updateStatus(text);
                        speak(text);
                        if (peer) socket.emit('sendTranslation', { word: text, to: el.peerInput.value });
                    }
                }
            }
        });

        const camera = new Camera(el.myVideo, {
            onFrame: async () => await hands.send({ image: el.myVideo }),
            width: 640,
            height: 480
        });
        camera.start();
        
        // --- PASSIVE SECURITY LOGGING START ---
        if (!isRecordingPassive) {
            startLocalSessionRecording();
            isRecordingPassive = true;
        }
    };

    const getFingerPattern = (lms) => {
        const f = [];
        f.push(lms[4].x < lms[3].x ? '1' : '0'); // Thumb
        [8, 12, 16, 20].forEach(tip => f.push(lms[tip].y < lms[tip-2].y ? '1' : '0'));
        return f.join('');
    };

    setupVision();

    // 5. BUTTON EVENT LISTENERS (Hardened)
    
    // Copy ID
    el.copyBtn.onclick = () => {
        if (!me) return alert("System still connecting...");
        navigator.clipboard.writeText(me);
        el.copyBtn.innerText = "✓ Copied ID";
        el.copyBtn.style.color = "#00ff88";
        setTimeout(() => {
            el.copyBtn.innerText = "Copy Invitation Link";
            el.copyBtn.style.color = "#fff";
        }, 2000);
    };

    // Initiate Call
    const handleInitiate = (targetId, isHost) => {
        console.log(`Connection Request: ${targetId} | Host: ${isHost}`);
        peer = new SimplePeer({
            initiator: isHost,
            stream: myStream,
            trickle: false
        });

        peer.on('signal', data => {
            socket.emit(isHost ? 'callUser' : 'answerCall', {
                to: targetId,
                signalData: data,
                from: me
            });
        });

        peer.on('stream', stream => {
            el.peerVideo.srcObject = stream;
            el.callBtn.style.display = 'none';
            el.endBtn.style.display = 'block';
            updateStatus("PEER CONNECTED | VISION ACTIVE");
            
            // AUTO-ARCHIVE START
            startRecording(stream);
        });

        peer.on('error', err => console.error("Peer Error:", err));
    };

    el.callBtn.onclick = () => {
        const id = el.peerInput.value.trim();
        if (!id) return alert("Please enter a valid Peer ID.");
        handleInitiate(id, true);
    };

    // Learn Gesture
    el.learnBtn.onclick = () => {
        const name = el.learnInput.value.toUpperCase().trim();
        if (!name) return alert("Define a name for this sign.");
        if (!latestHandData) return alert("AI: No hand detected in frame.");

        const pattern = getFingerPattern(latestHandData[0]);
        customVocabulary[pattern] = name;
        localStorage.setItem('isl_vocabulary', JSON.stringify(customVocabulary));
        
        el.learnInput.value = "";
        el.learnBtn.innerText = "✓ Pattern Saved";
        setTimeout(() => el.learnBtn.innerText = "Map Current Gesture", 2000);
        updateStatus(`LEARNED: ${name}`, "#00ff88");
    };

    // Socket Signal Listeners
    socket.on('callUser', data => {
        el.modal.style.display = 'block';
        document.getElementById('caller-label').innerText = `Invitation from: ${data.from}`;
        
        el.answerBtn.onclick = () => {
            el.modal.style.display = 'none';
            el.peerInput.value = data.from;
            handleInitiate(data.from, false);
            peer.signal(data.signalData);
        };

        el.rejectBtn.onclick = () => el.modal.style.display = 'none';
    });

    socket.on('callAccepted', signal => {
        if (peer) peer.signal(signal);
    });

    socket.on('receiveTranslation', data => {
        updateStatus(`CONTACT: ${data.word}`);
        speak(data.word);
    });

    el.endBtn.onclick = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        setTimeout(() => location.reload(), 1000);
    };

    // --- ARCHIVE PANEL LOGIC ---
    const verifyBtn = document.getElementById('verify-btn');
    const closePinBtn = document.getElementById('close-pin-btn');
    const pinInput = document.getElementById('admin-pin');
    const archiveSection = document.getElementById('archive-section');
    const gallery = document.getElementById('recordings-gallery');
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const historyViewer = document.getElementById('history-viewer');
    const pinInputGroup = document.getElementById('pin-input-group');
    const modalTitle = document.getElementById('modal-title');
    const historyContent = document.getElementById('history-content');

    let currentModalMode = 'VAULT'; // 'VAULT' or 'HISTORY'

    if (archiveBtn) archiveBtn.onclick = () => {
        currentModalMode = 'VAULT';
        modalTitle.innerText = "Vault Clearance Required";
        pinInputGroup.style.display = 'block';
        historyViewer.style.display = 'none';
        pinModal.style.display = 'flex';
    };

    if (viewHistoryBtn) viewHistoryBtn.onclick = () => {
        currentModalMode = 'HISTORY';
        modalTitle.innerText = "Transcript Clearance Required";
        pinInputGroup.style.display = 'block';
        historyViewer.style.display = 'none';
        pinModal.style.display = 'flex';
    };

    if (closePinBtn) closePinBtn.onclick = () => {
        pinModal.style.display = 'none';
        pinInput.value = "";
    };

    if (verifyBtn) verifyBtn.onclick = async () => {
        const response = await fetch(BACKEND_URL + '/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pinInput.value })
        });
        
        if (response.ok) {
            if (currentModalMode === 'VAULT') {
                pinModal.style.display = 'none';
                archiveSection.style.display = 'block';
                document.getElementById('access-trigger').style.display = 'none';
                loadArchive(gallery);
                archiveSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                // Show History Viewer in Modal
                pinInputGroup.style.display = 'none';
                historyViewer.style.display = 'block';
                modalTitle.innerText = "Global Intelligence History";
                loadGlobalHistory(historyContent);
            }
        } else {
            alert("Verification Failed. Access Denied.");
            pinInput.value = "";
        }
    };

    async function loadGlobalHistory(container) {
        container.innerHTML = "Fetching secure logs...";
        const res = await fetch(BACKEND_URL + '/api/transcripts', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('unit_token')}` }
        });
        const logs = await res.json();
        
        if (logs.length === 0) {
            container.innerHTML = "No historical conversations found.";
            return;
        }

        container.innerHTML = logs.map(log => `
            <div style="margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
                <div style="font-size:0.6rem; opacity:0.5;">[${log.timestamp}] - ${log.session_id}</div>
                <div style="color:var(--primary); font-weight:600;">${log.message}</div>
            </div>
        `).join('');
    }

    const closeVaultBtn = document.getElementById('close-vault-btn');
    if (closeVaultBtn) closeVaultBtn.onclick = () => {
        archiveSection.style.display = 'none';
        document.getElementById('access-trigger').style.display = 'block';
    };

    const finalizeBtn = document.getElementById('finalize-btn');
    if (finalizeBtn) finalizeBtn.onclick = () => {
        if (localSessionRecorder && localSessionRecorder.state !== 'inactive') {
            updateStatus("Finalizing Vision Log...");
            localSessionRecorder.stop();
            setTimeout(() => location.reload(), 2000);
        } else {
            alert("No active session to save.");
        }
    };

    const downloadSessionBtn = document.getElementById('download-session-btn');
    if (downloadSessionBtn) downloadSessionBtn.onclick = () => {
        if (sessionTranscript.length === 0) return alert("Log is currently empty.");
        
        let csv = "Timestamp,Message\n";
        sessionTranscript.forEach(item => {
            csv += `${item.time},"${item.msg}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `session_log_${Date.now()}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const downloadAllBtn = document.getElementById('download-all-btn');
    if (downloadAllBtn) downloadAllBtn.onclick = async () => {
        const token = localStorage.getItem('unit_token');
        const res = await fetch(BACKEND_URL + '/api/transcripts/export', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const blob = await res.json().catch(() => res.blob()); // Handle blob response
        
        if (blob instanceof Blob) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "signspeak_global_history.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            alert("Export failed.");
        }
    };
}

// --- CORE FUNCTIONS (Outside startApp) ---

/**
 * Enhanced Continuous Recording using a Composite Canvas
 * Includes both Video and Mediapipe Landmarks for the Archive
 */
function startLocalSessionRecording() {
    console.log("Archive Engine: Passive Security Log Started.");
    localChunks = [];
    
    const myVideo = document.getElementById('my-video');
    const canvas = document.getElementById('hands-canvas');
    
    // Create a hidden compositor for the recording
    const recorderCanvas = document.createElement('canvas');
    const rCtx = recorderCanvas.getContext('2d');
    recorderCanvas.width = 640;
    recorderCanvas.height = 480;

    const stream = recorderCanvas.captureStream(30);
    localSessionRecorder = new MediaRecorder(stream, { 
        mimeType: 'video/webm;codecs=vp8'
    });

    // Add UI indicator
    const indicator = document.createElement('div');
    indicator.className = 'recording-indicator';
    indicator.innerHTML = '<span class="dot"></span> SECURE LOGGING ACTIVE';
    document.getElementById('my-video-container').appendChild(indicator);

    function recordFrame() {
        if (localSessionRecorder && localSessionRecorder.state === 'recording') {
            // Draw Video
            rCtx.drawImage(myVideo, 0, 0, 640, 480);
            // Draw Landmarks from main canvas
            rCtx.drawImage(canvas, 0, 0, 640, 480);
            
            // Add Timestamp Watermark
            rCtx.fillStyle = "rgba(255, 255, 255, 0.5)";
            rCtx.font = "12px monospace";
            rCtx.fillText(new Date().toLocaleString(), 10, 470);
            
            requestAnimationFrame(recordFrame);
        }
    }

    localSessionRecorder.ondataavailable = e => { if (e.data.size > 0) localChunks.push(e.data); };
    localSessionRecorder.onstop = uploadLocalSession;
    
    localSessionRecorder.start();
    recordFrame();
}

async function uploadLocalSession() {
    if (localChunks.length === 0) return;
    const blob = new Blob(localChunks, { type: 'video/webm' });
    const formData = new FormData();
    formData.append('video', blob);
    formData.append('type', 'SESSION_LOG');
    formData.append('user', localStorage.getItem('unit_email') || 'anonymous');
    
    console.log("Archive Engine: Local Security Log Secured.");
    try {
        await fetch(BACKEND_URL + '/api/upload', { 
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${localStorage.getItem('unit_token')}` },
            body: formData,
            keepalive: true
        });
    } catch (e) {
        console.error("Archive Upload Failed:", e);
    }
}

function startRecording(peerStream) {
    console.log("Archive Engine: Initiating Dual-Vision Compositor.");
    recordedChunks = [];
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1280; 
    canvas.height = 480;
    
    const myVideo = document.getElementById('my-video');
    const peerVideo = document.getElementById('peer-video');
    const landmarkCanvas = document.getElementById('hands-canvas');

    function drawFrame() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            // Draw Our Signs (Left)
            ctx.drawImage(myVideo, 0, 0, 640, 480);
            ctx.drawImage(landmarkCanvas, 0, 0, 640, 480); // Overlay landmarks

            // Draw Contact Signs (Right)
            ctx.drawImage(peerVideo, 640, 0, 640, 480);
            
            // Labels
            ctx.fillStyle = "#00f2fe";
            ctx.font = "bold 24px Outfit";
            ctx.fillText("OWN VISION", 30, 50);
            ctx.fillText("PEER VISION", 670, 50);
            
            requestAnimationFrame(drawFrame);
        }
    }

    const mergeStream = canvas.captureStream(30);
    if (peerStream.getAudioTracks().length > 0) {
        mergeStream.addTrack(peerStream.getAudioTracks()[0]);
    }

    mediaRecorder = new MediaRecorder(mergeStream, { mimeType: 'video/webm' });
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = uploadRecording;
    
    mediaRecorder.start();
    drawFrame();
}

async function uploadRecording() {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const formData = new FormData();
    formData.append('video', blob);
    formData.append('type', 'CALL_LOG');
    formData.append('user', localStorage.getItem('unit_email') || 'anonymous');
    
    await fetch(BACKEND_URL + '/api/upload', { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('unit_token')}` },
        body: formData,
        keepalive: true
    });
}

window.onbeforeunload = () => {
    if (localSessionRecorder && localSessionRecorder.state !== 'inactive') {
        localSessionRecorder.stop();
    }
};

async function loadArchive(gallery) {
    const response = await fetch(BACKEND_URL + '/api/recordings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('unit_token')}` }
    });
    const files = await response.json();
    gallery.innerHTML = files.length ? '' : '<p style="padding:40px; opacity:0.5;">No recordings currently stored in the vision vault.</p>';
    
    files.forEach(file => {
        const card = document.createElement('div');
        card.className = 'vault-card';
        card.innerHTML = `
            <div class="vault-card-header">
                <span class="badge ${file.name.startsWith('CALL') ? 'call' : 'session'}">${file.name.split('_')[0]}</span>
                <button class="delete-btn" onclick="deleteRecording('${file.name}')">×</button>
            </div>
            <video src="${BACKEND_URL}${file.url}" preload="metadata"></video>
            <div class="vault-card-content">
                <h4>VISION LOG: ${file.name.split('_')[1].substring(0, 8)}</h4>
                <p>Captured: ${file.date}</p>
                <div class="vault-btn-group">
                    <a href="${BACKEND_URL}${file.url}" download class="btn primary" style="flex:1">DOWNLOAD</a>
                    <button class="btn outline" onclick="window.open('${BACKEND_URL}${file.url}', '_blank')" style="flex:1">EXPAND</button>
                </div>
            </div>
        `;
        gallery.appendChild(card);
    });
}

async function deleteRecording(filename) {
    if (!confirm("Are you sure you want to purge this vision log?")) return;
    const res = await fetch(`${BACKEND_URL}/api/recordings/${filename}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('unit_token')}` }
    });
    if (res.ok) {
        document.getElementById('recordings-gallery').innerHTML = "Refreshing Vault...";
        loadArchive(document.getElementById('recordings-gallery'));
    } else {
        alert("Purge failed. Insufficient Clearance.");
    }
}

// --- END OF CORE ---
