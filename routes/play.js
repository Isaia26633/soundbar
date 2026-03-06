const express    = require('express');
const router     = express.Router();
const { isAuthenticated } = require('../utils/middleware');
const { isOwner }         = require('../utils/owners');
const { transfer }        = require('../utils/transferManager');

const FORMPIX_URL = process.env.formpixUrl;
const API_KEY     = process.env.apiKey;
const POOL_ID     = Number(process.env.poolID);
const PRICE       = Number(process.env.price) || 0;

// POST /api/play — charge Digipogs (unless owner) then play sound on Formpix
router.post('/api/play', isAuthenticated, async (req, res) => {
    const { sfx, bgm, pin } = req.body;
    const userId = req.session.userId;
    const owner  = isOwner(userId);

    if (!sfx && !bgm) {
        return res.status(400).json({ error: 'Must provide sfx or bgm.' });
    }

    // Non-owners must pay
    if (!owner) {
        if (!pin) {
            return res.status(400).json({ error: 'PIN is required.' });
        }
        if (!POOL_ID || isNaN(POOL_ID)) {
            return res.status(500).json({ error: 'Server misconfigured: POOL_ID not set.' });
        }
        try {
            console.log(`[Payment] Transferring ${PRICE} Digipogs from ${userId} to pool ${POOL_ID}`);
            await transfer({
                from:   Number(userId),
                to:     POOL_ID,
                amount: PRICE,
                pin:    Number(pin),
                reason: `Soundbar — ${sfx || bgm}`
            });
            console.log('[Payment] Transfer successful');
        } catch (err) {
            console.error('[Payment] Transfer failed:', err.message);
            return res.status(402).json({ error: err.message || 'Payment failed.' });
        }
    } else {
        console.log(`[Payment] Owner ${userId} (${req.session.user}) — bypassing payment`);
    }

    // Play the sound on Formpix
    const params = new URLSearchParams();
    if (sfx) params.append('sfx', sfx);
    if (bgm) params.append('bgm', bgm);
    const url = `${FORMPIX_URL}/api/playSound?${params.toString()}`;
    console.log('[Formpix] Playing:', url);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'API': API_KEY, 'Content-Type': 'application/json' }
        });
        console.log('[Formpix] playSound response:', response.status, response.statusText);
        res.status(response.status).json({ status: response.status });
    } catch (err) {
        console.error('[Formpix] playSound error:', err);
        res.status(500).json({ error: 'Failed to contact Formpix.' });
    }
});

module.exports = router;
