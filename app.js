require('dotenv').config();
const express  = require('express');
const app      = express();
const port     = process.env.PORT || 3000;
const session  = require('express-session');
const socketManager = require('./utils/socketManager');
const authRouter    = require('./utils/auth');
const soundsRouter  = require('./routes/sounds');
const playRouter    = require('./routes/play');
const { isOwner }   = require('./utils/owners');
const { isAuthenticated } = require('./utils/middleware');

const FORMPIX_URL = process.env.formpixUrl;
const FORMBAR_URL = process.env.formbarUrl;
const POOL_ID     = Number(process.env.poolID);
const PRICE       = Number(process.env.price) || 0;

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
console.log(`[Config] Sound price: ${PRICE} Digipogs`);

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

// --- Main Page ---
app.get('/', isAuthenticated, (req, res) => {
  res.render('index', {
    user:  req.session.user,
    owner: isOwner(req.session.userId),
    price: PRICE
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
