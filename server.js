require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const contactRouter = require('./routes/contact');

const app = express();

// Trust Render's proxy so req.ip / rate limiting work correctly
app.set('trust proxy', 1);

// ---- Security headers ----
app.use(helmet());

// ---- CORS: only allow your actual site(s) to call this API ----
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // allow non-browser tools (curl/Postman) which send no origin
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  }
}));

// ---- Body parsing with a sane size limit ----
app.use(express.json({ limit: '100kb' }));

// ---- Global rate limit as a baseline against abuse/scraping ----
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

// ---- Routes ----
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/contact', contactRouter);

// ---- 404 fallback ----
app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// ---- Central error handler (keeps stack traces out of responses) ----
app.use((err, req, res, next) => {
  console.error(err);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed.' });
  }
  res.status(500).json({ error: 'Something went wrong.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Royal Furniture API running on port ${PORT}`));
