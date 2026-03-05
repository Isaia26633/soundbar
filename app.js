require('dotenv').config();
const express = require('express');
const app = express();
const port = 3000;
const jwt = require('jsonwebtoken');
const session = require('express-session');

const FORMPIX_URL = process.env.formpixUrl;
const API_KEY = process.env.apiKey;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(session({
  secret: 'secetnobodywillknowthisonebecauseitsocool',
  resave: false,
  saveUninitialized: false
}));

app.get('/', (req, res) => {
  res.render('index.ejs');
});

// --- Formpix proxy: GET /api/sounds ---
app.get('/api/sounds', async (req, res) => {
  try {
    console.log(`[Formpix] GET ${FORMPIX_URL}/api/getSounds`);
    const response = await fetch(`${FORMPIX_URL}/api/getSounds`, {
      method: 'GET',
      headers: {
        'API': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log(`[Formpix] Response status: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log('[Formpix] Response data:', JSON.stringify(data, null, 2));
    res.json(data);
  } catch (err) {
    console.error('Formpix /getSounds error:', err);
    res.status(502).json({ error: 'Failed to fetch sounds from Formpix.' });
  }
});

// --- Formpix proxy: POST /api/play ---
app.post('/api/play', async (req, res) => {
  const { sfx, bgm } = req.body;

  if (!sfx && !bgm) {
    return res.status(400).json({ error: 'Must provide sfx or bgm.' });
  }

  const body = {};
  if (sfx) body.sfx = sfx;
  if (bgm) body.bgm = bgm;
  console.log(
    JSON.stringify(body)
  )
  console.log('[/api/play] Playing sound:', body);
  console.log(`${FORMPIX_URL}/api/playSound?sfx=${encodeURIComponent(sfx)}`)

  try {
    const response = await fetch(`${FORMPIX_URL}/api/playSound?sfx=${encodeURIComponent(sfx)}`, {
      method: 'POST',
      headers: {
        'API': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    console.log('[/api/play] Formpix response:', response.status, response.statusText);
    res.status(response.status).json({ status: response.status });
  } catch (err) {
    console.error('[/api/play] Error:', err);
    res.status(500).json({ error: 'Failed to contact Formpix.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});