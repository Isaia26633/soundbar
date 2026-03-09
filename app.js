require('dotenv').config();
const express  = require('express');
const app      = express();
const port     = process.env.PORT || 3000;
const session  = require('express-session');
const socketManager = require('./utils/socketManager');
const authRouter    = require('./utils/auth');
const soundsRouter   = require('./routes/sounds');
const playRouter     = require('./routes/play');
const ticketsRouter  = require('./routes/tickets');
const { isOwner }    = require('./utils/owners');
const { getTickets } = require('./utils/db');
const { isAuthenticated } = require('./utils/middleware');

const FORMPIX_URL = process.env.formpixUrl;
const FORMBAR_URL = process.env.formbarUrl;
const POOL_ID     = Number(process.env.poolID);

// --- Validate config ---
if (!FORMPIX_URL?.startsWith('http')) {
  console.error(`[Config] ERROR: formpixUrl is invalid: "${FORMPIX_URL}"`);
} else {
  console.log(`[Config] Formpix URL: ${FORMPIX_URL}`);
}
if (!POOL_ID || isNaN(POOL_ID)) {
  console.error('[Config] ERROR: poolID is not set or invalid in .env');
} else {
  console.log(`[Config] Pool ID: ${POOL_ID}`);
}

// --- Connect to Formbar socket ---
socketManager.connect(FORMBAR_URL);

// --- Middleware ---
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'soundbar-secret',
  resave: false,
  saveUninitialized: false
}));

// --- Routes ---
app.use(authRouter);
app.use(soundsRouter);
app.use(playRouter);
app.use(ticketsRouter);

const PACKS = {
  starter: { tickets: 20,  cost: 80,  label: 'Starter Pack', discount: 20 },
  value:   { tickets: 50,  cost: 175, label: 'Value Pack',   discount: 30 },
  max:     { tickets: 100, cost: 300, label: 'Max Pack',     discount: 40 },
};

// --- Main Page ---
app.get('/', isAuthenticated, async (req, res) => {
  const tickets = await getTickets(req.session.userId).catch(() => 0);
  res.render('index', {
    user:    req.session.user,
    owner:   isOwner(req.session.userId),
    tickets
  });
});

// --- Shop Page ---
app.get('/shop', isAuthenticated, async (req, res) => {
  const tickets = await getTickets(req.session.userId).catch(() => 0);
  res.render('shop', {
    user:    req.session.user,
    owner:   isOwner(req.session.userId),
    tickets,
    packs:   PACKS
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
