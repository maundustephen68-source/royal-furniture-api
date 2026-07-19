const express = require('express');
const { z } = require('zod');
const pool = require('../db/pool');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// GET /api/products?category=Bedroom&search=bed
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const clauses = ['is_active = TRUE'];
    const params = [];

    if (category) {
      params.push(category);
      clauses.push(`category = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    const sql = `SELECT id, category, name, description, price_cents, currency, image_url, stock
                 FROM products WHERE ${clauses.join(' AND ')} ORDER BY category, id`;
    const { rows } = await pool.query(sql, params);
    res.json({ products: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load products.' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid product id.' });

  try {
    const { rows } = await pool.query(
      'SELECT id, category, name, description, price_cents, currency, image_url, stock FROM products WHERE id = $1 AND is_active = TRUE',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load product.' });
  }
});

// ------------------------------------------------------------------
// Admin-only: create / update / delete products (requires x-admin-key)
// ------------------------------------------------------------------

const productSchema = z.object({
  category: z.string().min(1).max(60),
  name: z.string().min(1).max(150),
  description: z.string().min(1).max(1000),
  price_cents: z.number().int().nonnegative(),
  image_url: z.string().url(),
  stock: z.number().int().nonnegative().default(100),
  is_active: z.boolean().default(true)
});

router.post('/', adminAuth, async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const p = parsed.data;
  try {
    const { rows } = await pool.query(
      `INSERT INTO products (category, name, description, price_cents, image_url, stock, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [p.category, p.name, p.description, p.price_cents, p.image_url, p.stock, p.is_active]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = productSchema.partial().safeParse(req.body);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid product id.' });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const fields = Object.entries(parsed.data);
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update.' });

  const setClause = fields.map(([k], i) => `${k} = $${i + 1}`).join(', ');
  const values = fields.map(([, v]) => v);

  try {
    const { rowCount } = await pool.query(
      `UPDATE products SET ${setClause} WHERE id = $${fields.length + 1}`,
      [...values, id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid product id.' });

  try {
    const { rowCount } = await pool.query('UPDATE products SET is_active = FALSE WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

module.exports = router;
