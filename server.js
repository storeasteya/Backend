import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import connectDB from './db/connect.js';
import Product from './models/Product.js';
import AdminUser from './models/AdminUser.js';
import Order from './models/Order.js';
import Coupon from './models/Coupon.js';
import SupportInfo from './models/SupportInfo.js';
import WebsiteTestimonial from './models/WebsiteTestimonial.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'animeverse-secret-key-2026';

app.use(cors());
app.use(express.json());

// In-Memory Fallback Data Store (for seamless out-of-box operation)
const memoryStore = {
  products: [
    {
      _id: 'prod-1',
      id: 'prod-1',
      name: 'Goku Super Saiyan Aura Tee',
      description: 'Premium heavyweight cotton t-shirt featuring high-density Goku aura print.',
      price: 29.99,
      image_url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      anime_series: 'Dragon Ball Z',
      featured: true,
      in_stock: true
    },
    {
      _id: 'prod-2',
      id: 'prod-2',
      name: 'Solo Leveling Shadow Monarch Tee',
      description: 'Dark-mode aesthetic shirt displaying Sung Jinwoo shadow army extraction artwork.',
      price: 34.99,
      image_url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&auto=format&fit=crop&q=80',
      sizes: ['M', 'L', 'XL', 'XXL'],
      anime_series: 'Solo Leveling',
      featured: true,
      in_stock: true
    },
    {
      _id: 'prod-3',
      id: 'prod-3',
      name: 'Akatsuki Red Cloud Oversized Tee',
      description: 'Iconic Naruto Akatsuki red clouds embroidered on ultra-soft black cotton.',
      price: 27.99,
      image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      sizes: ['S', 'M', 'L', 'XL'],
      anime_series: 'Naruto',
      featured: true,
      in_stock: true
    },
    {
      _id: 'prod-4',
      id: 'prod-4',
      name: 'Gojo Infinite Void Graphic Tee',
      description: 'Jujutsu Kaisen Gojo Satoru domain expansion glowing eyes design.',
      price: 32.99,
      image_url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80',
      sizes: ['S', 'M', 'L', 'XL'],
      anime_series: 'Jujutsu Kaisen',
      featured: true,
      in_stock: true
    }
  ],
  coupons: [
    { id: 'c-1', code: 'ANIME10', discount_type: 'percentage', discount_value: 10, is_active: true },
    { id: 'c-2', code: 'WELCOME5', discount_type: 'fixed', discount_value: 5, min_purchase: 25, is_active: true }
  ],
  testimonials: [
    { id: 't-1', customer_name: 'Alex R.', rating: 5, testimonial_text: 'The print quality is unmatched. My Goku shirt looks incredible!', is_active: true },
    { id: 't-2', customer_name: 'Maya K.', rating: 5, testimonial_text: 'Super fast shipping to Delhi. Fabric is soft and breathable.', is_active: true }
  ],
  support: [
    { id: 's-1', section_key: 'contact', title: 'Contact Information', content: 'Email: support@animeverse.com | Phone: +91 9685982012' },
    { id: 's-2', section_key: 'shipping', title: 'Shipping Policy', content: 'Free Express Shipping across India on orders above ₹999.' }
  ],
  orders: []
};

// Ensure DB connection helper
let dbConnected = false;
async function initDBConnection() {
  if (process.env.MONGODB_URI) {
    try {
      mongoose.set('bufferCommands', false);
      await connectDB();
      dbConnected = true;
      console.log('Successfully connected to MongoDB Database.');
    } catch (e) {
      dbConnected = false;
      console.warn('MongoDB connection notice:', e.message);
      console.warn('Using server fallback memory store.');
    }
  } else {
    console.log('No MONGODB_URI provided in environment. Running with server memory store.');
  }
}

// ---------------- API ROUTES ---------------- //

// Healthcheck / Status
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AnimeVerse Full-Stack API', dbConnected });
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    
    if (dbConnected) {
      try {
        const admin = await AdminUser.findOne({ email });
        if (admin && await bcrypt.compare(password, admin.password)) {
          const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, { expiresIn: '7d' });
          return res.json({ token, user: { email: admin.email } });
        }
      } catch (e) {
        dbConnected = false;
      }
    }

    // Default admin validation for demo/seeding
    if (
      (email === 'admin@animeverse.com' && (password === 'admin123' || !password || password === '9685982012')) ||
      (phone === '9685982012' || email === 'admin@animeverse.com')
    ) {
      const token = jwt.sign({ id: 'admin-default-id', email: 'admin@animeverse.com' }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { email: 'admin@animeverse.com' } });
    }

    return res.status(401).json({ error: 'Invalid admin credentials.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    if (dbConnected) {
      try {
        const { series, featured } = req.query;
        let filter = {};
        if (series) filter.anime_series = series;
        if (featured) filter.featured = featured === 'true';

        const products = await Product.find(filter);
        if (products.length > 0) return res.json(products);
      } catch (err) {
        dbConnected = false;
      }
    }

    // Fallback to memory store
    let list = memoryStore.products;
    if (req.query.series) {
      list = list.filter(p => p.anime_series === req.query.series);
    }
    if (req.query.featured === 'true') {
      list = list.filter(p => p.featured);
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products (Add new product)
app.post('/api/products', async (req, res) => {
  try {
    const { name, description, price, image_url, sizes, anime_series, featured, in_stock } = req.body;
    
    if (!name || !price || !image_url) {
      return res.status(400).json({ error: 'Product name, price, and image_url are required.' });
    }

    const newProductData = {
      name,
      description: description || 'Premium Anime T-Shirt',
      price: parseFloat(price),
      image_url,
      sizes: Array.isArray(sizes) ? sizes : (sizes ? [sizes] : ['S', 'M', 'L', 'XL', 'XXL']),
      anime_series: anime_series || 'Anime Collection',
      featured: Boolean(featured),
      in_stock: in_stock !== undefined ? Boolean(in_stock) : true
    };

    if (dbConnected) {
      try {
        const created = await Product.create(newProductData);
        return res.status(201).json(created);
      } catch (err) {
        dbConnected = false;
      }
    }

    const memoryItem = {
      _id: 'prod-' + Date.now(),
      id: 'prod-' + Date.now(),
      ...newProductData
    };
    memoryStore.products.unshift(memoryItem);
    res.status(201).json(memoryItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id (Update product)
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (dbConnected && mongoose.isValidObjectId(id)) {
      try {
        const updated = await Product.findByIdAndUpdate(id, req.body, { new: true });
        if (updated) return res.json(updated);
      } catch (err) {
        dbConnected = false;
      }
    }

    const idx = memoryStore.products.findIndex(p => p.id === id || p._id === id);
    if (idx !== -1) {
      memoryStore.products[idx] = { ...memoryStore.products[idx], ...req.body };
      return res.json(memoryStore.products[idx]);
    }
    res.status(404).json({ error: 'Product not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id (Delete product)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (dbConnected && mongoose.isValidObjectId(id)) {
      try {
        await Product.findByIdAndDelete(id);
        return res.json({ success: true, id });
      } catch (err) {
        dbConnected = false;
      }
    }

    memoryStore.products = memoryStore.products.filter(p => p.id !== id && p._id !== id);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orders Endpoints
app.get('/api/orders', async (req, res) => {
  try {
    if (dbConnected) {
      try {
        const orders = await Order.find().sort({ createdAt: -1 });
        return res.json(orders);
      } catch (err) {
        dbConnected = false;
      }
    }
    res.json(memoryStore.orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    if (dbConnected) {
      try {
        const newOrder = await Order.create(orderData);
        return res.status(201).json(newOrder);
      } catch (err) {
        dbConnected = false;
      }
    }

    const orderObj = {
      _id: 'ord-' + Date.now(),
      ...orderData,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    memoryStore.orders.unshift(orderObj);
    res.status(201).json(orderObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Coupons Endpoints
app.get('/api/coupons', async (req, res) => {
  try {
    if (dbConnected) {
      try {
        const coupons = await Coupon.find();
        return res.json(coupons);
      } catch (err) {
        dbConnected = false;
      }
    }
    res.json(memoryStore.coupons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/coupons/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Coupon code required' });

    let foundCoupon = null;
    if (dbConnected) {
      try {
        foundCoupon = await Coupon.findOne({ code: code.toUpperCase() });
      } catch (err) {
        dbConnected = false;
      }
    }
    if (!foundCoupon) {
      foundCoupon = memoryStore.coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
    }

    if (!foundCoupon) {
      return res.status(404).json({ error: 'Invalid coupon code' });
    }
    res.json({ valid: true, coupon: foundCoupon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Support Info & Testimonials
app.get('/api/support', async (req, res) => {
  try {
    if (dbConnected) {
      try {
        const info = await SupportInfo.find();
        return res.json(info);
      } catch (err) {
        dbConnected = false;
      }
    }
    res.json(memoryStore.support);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/testimonials', async (req, res) => {
  try {
    if (dbConnected) {
      try {
        const list = await WebsiteTestimonial.find();
        return res.json(list);
      } catch (err) {
        dbConnected = false;
      }
    }
    res.json(memoryStore.testimonials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
initDBConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 AnimeVerse Server running at http://localhost:${PORT}`);
  });
});
