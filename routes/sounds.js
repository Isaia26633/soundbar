const express    = require('express');
const router     = express.Router();
const { isAuthenticated } = require('../utils/middleware');

const FORMPIX_URL = process.env.formpixUrl;
const API_KEY     = process.env.apiKey;

// GET /api/sounds — fetch sound list from Formpix
router.get('/api/sounds', isAuthenticated, async (req, res) => {
    try {
        console.log(`[Formpix] GET ${FORMPIX_URL}/api/getSounds`);
        const response = await fetch(`${FORMPIX_URL}/api/getSounds`, {
            method: 'GET',
            headers: { 'API': API_KEY, 'Content-Type': 'application/json' }
        });
        console.log(`[Formpix] getSounds: ${response.status} ${response.statusText}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('[Formpix] getSounds error:', err);
        res.status(502).json({ error: 'Failed to fetch sounds from Formpix.' });
    }
});

module.exports = router;
