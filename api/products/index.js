import connectDB from '../../db/connect.js';
import Product from '../../models/Product.js';
import { verifyAdmin, corsHeaders } from '../../middleware/auth.js';

export default async function handler(req, res) {
  // Set CORS headers
  const headers = corsHeaders(req);
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await connectDB();

  if (req.method === 'GET') {
    try {
      const { series, size, featured } = req.query;
      let filter = {};
      if (series) filter.anime_series = series;
      if (size) filter.sizes = size;
      if (featured) filter.featured = featured === 'true';

      const products = await Product.find(filter);
      return res.status(200).json(products);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      verifyAdmin(req);
      const product = await Product.create(req.body);
      return res.status(201).json(product);
    } catch (err) {
      if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
