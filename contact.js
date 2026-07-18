const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages sent. Please try again later.' }
});

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional().or(z.literal('')),
  message: z.string().min(10).max(2000)
});

// POST /api/contact
router.post('/', contactLimiter, async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, email, phone, message } = parsed.data;
  try {
    await pool.query(
      `INSERT INTO contact_messages (name, email, phone, message) VALUES ($1,$2,$3,$4)`,
      [name, email, phone || null, message]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// GET /api/contact — admin only, view submitted messages
router.get('/', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200');
    res.json({ messages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load messages.' });
  }
});

module.exports = router;
