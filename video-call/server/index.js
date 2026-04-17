const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE INITIALIZATION ---
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) console.error("Database Connection Error:", err.message);
    else console.log("Connected to the Secure Users Vault (SQLite).");
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT,
        session_id TEXT,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Secret for JWT
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// --- AUTH ENDPOINTS ---

// 1. Registration
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing identity data" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (email, password) VALUES (?, ?)`, [email, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) return res.status(400).json({ error: "Email already registered" });
                return res.status(500).json({ error: "Database error" });
            }
            res.json({ success: true, userId: this.lastID });
        });
    } catch (e) {
        res.status(500).json({ error: "Encryption error" });
    }
});

// 2. Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!user) return res.status(401).json({ error: "Identity not found" });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, email: user.email });
    });
});

// Memory store for OTPs (Verification Codes)
const otpStore = {};

// 3. Request Reset Code
app.post('/api/auth/request-reset', (req, res) => {
    const { email } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (!user) return res.status(404).json({ error: "Identity not found" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = otp;

        console.log("-----------------------------------------");
        console.log(`🔐 SECURITY ALERT: Reset Code for ${email}`);
        console.log(`CODE: ${otp}`);
        console.log("-----------------------------------------");

        res.json({ success: true, message: "Verification code sent to terminal" });
    });
});

// 4. Verify & Update Password
app.post('/api/auth/reset', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (otpStore[email] !== otp) {
        return res.status(401).json({ error: "Invalid Verification Code" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.run(`UPDATE users SET password = ? WHERE email = ?`, [hashedPassword, email], function (err) {
        if (err) return res.status(500).json({ error: "Database error" });
        delete otpStore[email]; // Clear OTP after use
        res.json({ success: true });
    });
});

// Configure storage for recordings with Type Categorization
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './recordings';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const type = req.body.type || 'RAW';
        cb(null, `${type}_${Date.now()}.webm`);
    }
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, '../client')));
app.use('/archive', express.static(path.join(__dirname, 'recordings')));

const ADMIN_PIN = "1234";
app.post('/api/verify', (req, res) => {
    if (req.body.pin === ADMIN_PIN) return res.json({ success: true });
    res.status(401).json({ success: false });
});

// --- ARCHIVE ENGINE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.get('/api/recordings', authenticateToken, (req, res) => {
    const dir = './recordings';
    if (!fs.existsSync(dir)) return res.json([]);

    // Filter by user email if provided in metadata (simulated here by filename prefix if we wanted, 
    // but for now we'll show all logs authorized for this user's 'identity branch')
    const files = fs.readdirSync(dir)
        .filter(file => file.endsWith('.webm'))
        .map(file => {
            const parts = file.split('_');
            const timestamp = parts.length > 1 ? parts[1].replace('.webm', '') : Date.now();
            return {
                name: file,
                url: `/archive/${file}`,
                date: new Date(parseInt(timestamp)).toLocaleString()
            };
        })
        .sort((a, b) => b.name.localeCompare(a.name)); // Newest first

    res.json(files);
});

app.delete('/api/recordings/:filename', authenticateToken, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'recordings', filename);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "File not found" });
    }
});

app.post('/api/upload', authenticateToken, upload.single('video'), (req, res) => {
    res.json({ success: true, file: req.file.filename });
});

// --- TRANSCRIPT ENGINE ---
app.post('/api/transcripts', authenticateToken, (req, res) => {
    const { message, session_id } = req.body;
    const user_email = req.user.email;

    db.run(`INSERT INTO transcripts (user_email, session_id, message) VALUES (?, ?, ?)`,
        [user_email, session_id, message], (err) => {
            if (err) return res.status(500).json({ error: "Storage failure" });
            res.json({ success: true });
        });
});

app.get('/api/transcripts', authenticateToken, (req, res) => {
    const user_email = req.user.email;
    db.all(`SELECT * FROM transcripts WHERE user_email = ? ORDER BY timestamp DESC`, [user_email], (err, rows) => {
        if (err) return res.status(500).json({ error: "Retrieval failure" });
        res.json(rows);
    });
});

app.get('/api/transcripts/export', authenticateToken, (req, res) => {
    const user_email = req.user.email;
    db.all(`SELECT * FROM transcripts WHERE user_email = ? ORDER BY timestamp DESC`, [user_email], (err, rows) => {
        if (err) return res.status(500).json({ error: "Retrieval failure" });

        let csv = "ID,Session,Message,Timestamp\n";
        rows.forEach(row => {
            csv += `${row.id},${row.session_id},"${row.message}",${row.timestamp}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=signspeak_history.csv');
        res.send(csv);
    });
});

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    socket.emit("me", socket.id);
    socket.on("callUser", (data) => {
        io.to(data.to).emit("callUser", { signalData: data.signalData, from: data.from });
    });
    socket.on("answerCall", (data) => {
        io.to(data.to).emit("callAccepted", data.signalData);
    });
    socket.on("sendTranslation", (data) => {
        if (data.to) io.to(data.to).emit("receiveTranslation", data);
        else socket.broadcast.emit("receiveTranslation", data);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`SignSpeak Advanced Terminal | Listening on Port ${PORT}`));
