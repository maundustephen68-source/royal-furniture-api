/**
 * Seeds the products table.
 * Run with: npm run seed
 *
 * Includes your original 12 products plus 12 new placeholder products
 * (4 per category) so the catalog looks fuller immediately. Placeholder
 * images are generic stock photos from Unsplash's source service — swap
 * image_url for your real product photos whenever you're ready, either
 * by editing this file and re-seeding, or via the admin API.
 */
require('dotenv').config();
const pool = require('./pool');

const products = [
  // ---------------- Living Room (original) ----------------
  { category: 'Living Room', name: 'Luxury Sofa Set', description: 'Elegant leather sofa built for comfort and luxury interiors.', price_cents: 85000, image_url: 'https://source.unsplash.com/600x400/?leather-sofa' },
  { category: 'Living Room', name: 'Modern Coffee Table', description: 'Stylish wooden coffee table with premium finishing and LED lights.', price_cents: 25000, image_url: 'https://source.unsplash.com/600x400/?coffee-table' },
  { category: 'Living Room', name: 'Modern TV Stand', description: 'Durable entertainment stand with spacious storage and LED lighting.', price_cents: 32000, image_url: 'https://source.unsplash.com/600x400/?tv-stand' },
  { category: 'Living Room', name: 'Luxury Armchair', description: 'Comfortable and stylish chair designed for relaxation in any space.', price_cents: 42000, image_url: 'https://source.unsplash.com/600x400/?armchair' },
  // ---------------- Living Room (new placeholders) ----------------
  { category: 'Living Room', name: 'Reclining Sectional Sofa', description: 'Spacious L-shaped sectional with built-in reclining seats, perfect for family lounging.', price_cents: 132000, image_url: 'https://source.unsplash.com/600x400/?sectional-sofa' },
  { category: 'Living Room', name: 'Round Accent Side Table', description: 'Compact marble-top side table that pairs well with any sofa arrangement.', price_cents: 14000, image_url: 'https://source.unsplash.com/600x400/?side-table' },
  { category: 'Living Room', name: 'Wall-Mounted Bookshelf Unit', description: 'Floating shelf system for displaying books and décor without taking up floor space.', price_cents: 21000, image_url: 'https://source.unsplash.com/600x400/?wall-shelf' },
  { category: 'Living Room', name: 'Ottoman Storage Pouf', description: 'Multi-purpose ottoman with hidden storage, doubles as extra seating.', price_cents: 9500, image_url: 'https://source.unsplash.com/600x400/?ottoman' },

  // ---------------- Bedroom (original) ----------------
  { category: 'Bedroom', name: 'Royal King Bed', description: 'Premium king-size bed with modern luxury design for restful nights.', price_cents: 120000, image_url: 'https://source.unsplash.com/600x400/?bed-frame' },
  { category: 'Bedroom', name: 'Luxury Wardrobe', description: 'Spacious wardrobe with elegant wood finishing and ample storage.', price_cents: 70000, image_url: 'https://source.unsplash.com/600x400/?wardrobe' },
  { category: 'Bedroom', name: 'Bedside Table', description: 'Compact bedside table with premium craftsmanship and rustic warmth.', price_cents: 15000, image_url: 'https://source.unsplash.com/600x400/?nightstand' },
  { category: 'Bedroom', name: 'Dressing Table', description: 'Modern dressing table with mirror and spacious drawers.', price_cents: 48000, image_url: 'https://source.unsplash.com/600x400/?dressing-table' },
  // ---------------- Bedroom (new placeholders) ----------------
  { category: 'Bedroom', name: 'Queen Storage Bed', description: 'Queen-size bed frame with under-bed drawers for extra storage.', price_cents: 95000, image_url: 'https://source.unsplash.com/600x400/?bedroom-furniture' },
  { category: 'Bedroom', name: '5-Drawer Tallboy Dresser', description: 'Tall chest of drawers ideal for smaller bedrooms needing vertical storage.', price_cents: 42000, image_url: 'https://source.unsplash.com/600x400/?dresser' },
  { category: 'Bedroom', name: 'Upholstered Bench', description: 'Cushioned bedroom bench, perfect for the foot of the bed.', price_cents: 18000, image_url: 'https://source.unsplash.com/600x400/?bedroom-bench' },
  { category: 'Bedroom', name: 'Full-Length Mirror with Frame', description: 'Elegant wood-framed standing mirror for any bedroom corner.', price_cents: 12000, image_url: 'https://source.unsplash.com/600x400/?floor-mirror' },

  // ---------------- Office (original) ----------------
  { category: 'Office', name: 'Executive Desk', description: 'Professional office desk designed for maximum productivity.', price_cents: 60000, image_url: 'https://source.unsplash.com/600x400/?office-desk' },
  { category: 'Office', name: 'Executive Office Chair', description: 'Ergonomic office chair with comfortable lumbar support up to 160kg.', price_cents: 30000, image_url: 'https://source.unsplash.com/600x400/?office-chair' },
  { category: 'Office', name: 'Modern Bookshelf', description: 'Sleek modern bookshelf ideal for offices and study rooms.', price_cents: 40000, image_url: 'https://source.unsplash.com/600x400/?bookshelf' },
  { category: 'Office', name: 'Conference Table', description: 'Elegant rectangular conference table for professional boardrooms.', price_cents: 95000, image_url: 'https://source.unsplash.com/600x400/?conference-table' },
  // ---------------- Office (new placeholders) ----------------
  { category: 'Office', name: 'Standing Desk Converter', description: 'Adjustable desktop riser to switch between sitting and standing work.', price_cents: 22000, image_url: 'https://source.unsplash.com/600x400/?standing-desk' },
  { category: 'Office', name: 'Mesh-Back Task Chair', description: 'Breathable mesh office chair with adjustable armrests, built for long workdays.', price_cents: 24000, image_url: 'https://source.unsplash.com/600x400/?task-chair' },
  { category: 'Office', name: '3-Drawer Filing Cabinet', description: 'Lockable filing cabinet for organized document storage in any office.', price_cents: 19000, image_url: 'https://source.unsplash.com/600x400/?filing-cabinet' },
  { category: 'Office', name: 'Reception Desk Counter', description: 'Modern front-desk counter unit designed for offices and showrooms.', price_cents: 78000, image_url: 'https://source.unsplash.com/600x400/?reception-desk' }
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM products'); // fresh seed; remove this line if you want to keep appending instead

    for (const p of products) {
      await client.query(
        `INSERT INTO products (category, name, description, price_cents, currency, image_url, stock, is_active)
         VALUES ($1, $2, $3, $4, 'USD', $5, 100, TRUE)`,
        [p.category, p.name, p.description, p.price_cents, p.image_url]
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${products.length} products successfully.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
