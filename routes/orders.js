const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Limit checkout attempts to slow down abuse/scripted tampering attempts.
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many checkout attempts. Please wait a few minutes and try again.' }
});

const cartItemSchema = z.object({
  id: z.number().int().positive(),
  qty: z.number().int().positive().max(50) // sane per-item cap
});

const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().min(2).max(100),
    phone: z.string().min(7).max(20)
  }),
  items: z.array(cartItemSchema).min(1).max(50)
});

function signOrderRef(ref) {
  const secret = process.env.ORDER_SIGNING_SECRET;
  return crypto.createHmac('sha256', secret).update(ref).digest('hex').slice(0, 10);
}

function formatMoney(cents, currency) {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

// POST /api/orders — the ONLY path that should lead to a checkout.
// The client sends product IDs + quantities only. All names/prices are
// looked up server-side, so nothing the browser sends can change the total.
router.post('/', orderLimiter, async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { customer, items } = parsed.data;
  const ids = items.map(i => i.id);

  try {
    const { rows: dbProducts } = await pool.query(
      `SELECT id, name, price_cents, currency, stock FROM products WHERE id = ANY($1) AND is_active = TRUE`,
      [ids]
    );

    const byId = new Map(dbProducts.map(p => [p.id, p]));
    const missing = ids.filter(id => !byId.has(id));
    if (missing.length > 0) {
      return res.status(400).json({ error: `Product(s) not found or unavailable: ${missing.join(', ')}` });
    }

    let subtotalCents = 0;
    const validatedItems = items.map(({ id, qty }) => {
      const product = byId.get(id);
      if (qty > product.stock) {
        throw Object.assign(new Error(`Only ${product.stock} units of "${product.name}" are in stock.`), { status: 409 });
      }
      subtotalCents += product.price_cents * qty;
      return { id, name: product.name, unit_price_cents: product.price_cents, currency: product.currency, qty };
    });

    const orderRef = `RF${Date.now().toString(36).toUpperCase()}`;
    const signature = signOrderRef(orderRef);
    const fullRef = `${orderRef}-${signature}`;

    await pool.query(
      `INSERT INTO orders (order_ref, customer_name, customer_phone, items_json, subtotal_cents, status)
       VALUES ($1,$2,$3,$4,$5,'pending')`,
      [fullRef, customer.name, customer.phone, JSON.stringify(validatedItems), subtotalCents]
    );

    const currency = validatedItems[0].currency;
    const lines = validatedItems.map(
      i => `• ${i.name} x${i.qty} — ${formatMoney(i.unit_price_cents * i.qty, currency)}`
    );
    const message =
      `Hello Royal Furniture! I'd like to order:\n\n${lines.join('\n')}\n\n` +
      `Total: ${formatMoney(subtotalCents, currency)}\n` +
      `Order Ref: ${fullRef}\n` +
      `Name: ${customer.name}\nPhone: ${customer.phone}`;

    const waNumber = process.env.WHATSAPP_NUMBER;
    const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

    res.status(201).json({
      orderRef: fullRef,
      subtotal: formatMoney(subtotalCents, currency),
      items: validatedItems,
      whatsappUrl
    });
  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: err.status ? err.message : 'Failed to create order.' });
  }
});

// GET /api/orders/:ref — lets staff verify an order is genuine (admin only)
router.get('/:ref', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders WHERE order_ref = $1', [req.params.ref]);
    if (!rows[0]) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load order.' });
  }
});

module.exports = router;
