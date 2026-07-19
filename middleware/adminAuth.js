// Protects admin-only routes (creating/editing/deleting products).
// Requires the caller to send a header:  x-admin-key: <ADMIN_API_KEY>
// This key must never be embedded in frontend JavaScript — only use it
// from a trusted place (Postman, a private admin tool, curl, etc.).

const crypto = require('crypto');

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = function adminAuth(req, res, next) {
  const provided = req.get('x-admin-key');
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    return res.status(500).json({ error: 'Server misconfigured: ADMIN_API_KEY not set.' });
  }
  if (!provided || !timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
};
