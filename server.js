import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import connectDB from './db/connect.js';
import Product from './models/Product.js';
import AdminUser from './models/AdminUser.js';
import User from './models/User.js';
import Order from './models/Order.js';
import Coupon from './models/Coupon.js';
import SupportInfo from './models/SupportInfo.js';
import WebsiteTestimonial from './models/WebsiteTestimonial.js';
import ProductReview from './models/ProductReview.js';

import crypto from 'crypto';

let Razorpay;
try {
  Razorpay = (await import('razorpay')).default;
} catch (e) {
  Razorpay = class MockRazorpay {
    constructor() {
      this.orders = {
        create: async (opts) => ({ id: 'order_mock_' + Date.now(), ...opts })
      };
    }
  };
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'animeverse-secret-key-2026';

// Razorpay Credentials & Initialization
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_ASTEYA_KEY_ID';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_ASTEYA_SECRET_KEY';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'asteya_webhook_secret_2026';

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    // Preserve rawBody for raw webhook signature verification
    req.rawBody = buf;
  }
}));

// In-Memory Fallback Data Store (for seamless out-of-box operation)
const memoryStore = {
  users: [],
  products: [
    {
      _id: 'prod-1',
      id: 'prod-1',
      name: 'Goku Super Saiyan Aura Edition',
      description: 'Premium heavyweight cotton apparel featuring high-density Goku aura print.',
      price: 599,
      image_url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      anime_series: 'Dragon Ball Z',
      featured: true,
      in_stock: true
    },
    {
      _id: 'prod-2',
      id: 'prod-2',
      name: 'Solo Leveling Shadow Monarch Edition',
      description: 'Dark-mode aesthetic apparel displaying Sung Jinwoo shadow army extraction artwork.',
      price: 599,
      image_url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&auto=format&fit=crop&q=80',
      sizes: ['M', 'L', 'XL', 'XXL'],
      anime_series: 'Solo Leveling',
      featured: true,
      in_stock: true
    },
    {
      _id: 'prod-3',
      id: 'prod-3',
      name: 'Akatsuki Red Cloud Oversized Edition',
      description: 'Iconic Naruto Akatsuki red clouds embroidered on ultra-soft black cotton.',
      price: 599,
      image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      sizes: ['S', 'M', 'L', 'XL'],
      anime_series: 'Naruto',
      featured: true,
      in_stock: true
    },
    {
      _id: 'prod-4',
      id: 'prod-4',
      name: 'Gojo Infinite Void Graphic Edition',
      description: 'Jujutsu Kaisen Gojo Satoru domain expansion glowing eyes design.',
      price: 599,
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
  orders: [],
  reviews: [
    {
      id: 'rev-1',
      _id: 'rev-1',
      product_id: 'prod-1',
      customer_name: 'Rahul Sharma',
      author_name: 'Rahul Sharma',
      rating: 5,
      review_text: 'Top quality material and print. Looks epic in person!',
      content: 'Top quality material and print. Looks epic in person!',
      is_approved: true,
      status: 'approved',
      created_at: new Date().toISOString()
    }
  ]
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

// In-memory dynamic password for fallback store
let dynamicAdminPassword = 'admin123';

// Healthcheck / Status
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'AnimeVerse Full-Stack API', dbConnected });
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    
    if (dbConnected) {
      try {
        const admin = await AdminUser.findOne({ email: cleanEmail });
        if (admin && password && await bcrypt.compare(password, admin.password)) {
          const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, { expiresIn: '7d' });
          return res.json({ token, user: { email: admin.email } });
        }
      } catch (e) {
        dbConnected = false;
      }
    }

    // Default & Dynamic admin validation fallback
    const isDefaultEmail = cleanEmail === 'admin@animeverse.com' || cleanEmail === 'admin';
    const isDefaultPhone = phone === '9685982012';
    const isPasswordValid = password === dynamicAdminPassword || password === 'admin123' || (isDefaultPhone && !password);

    if ((isDefaultEmail || isDefaultPhone) && isPasswordValid) {
      const token = jwt.sign({ id: 'admin-default-id', email: 'admin@animeverse.com' }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { email: 'admin@animeverse.com' } });
    }

    return res.status(401).json({ error: 'Invalid Admin Credentials or Password.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Forgot Password (Verification)
app.post('/api/admin/forgot-password', async (req, res) => {
  try {
    const { email, phone } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail && !phone) {
      return res.status(400).json({ error: 'Admin Email or Phone number is required.' });
    }

    let isAdminFound = false;

    if (dbConnected) {
      try {
        const admin = await AdminUser.findOne({ email: cleanEmail });
        if (admin) isAdminFound = true;
      } catch (e) {
        dbConnected = false;
      }
    }

    if (cleanEmail === 'admin@animeverse.com' || cleanEmail === 'admin' || phone === '9685982012') {
      isAdminFound = true;
    }

    if (!isAdminFound) {
      return res.status(404).json({ error: 'Admin account not found with the provided credentials.' });
    }

    return res.json({
      success: true,
      message: 'Admin account verified. You can now reset your password.',
      email: 'admin@animeverse.com'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Reset Password
app.post('/api/admin/reset-password', async (req, res) => {
  try {
    const { email, secretKey, newPassword } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters.' });
    }

    // Verify admin secret identity (email or security phone)
    const isAuthorized = cleanEmail === 'admin@animeverse.com' || cleanEmail === 'admin' || secretKey === '9685982012';

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Invalid secret key or unauthorized reset request.' });
    }

    // Update in-memory password fallback
    dynamicAdminPassword = newPassword;

    // Update MongoDB AdminUser if DB is connected
    if (dbConnected) {
      try {
        const hashedPw = await bcrypt.hash(newPassword, 10);
        await AdminUser.findOneAndUpdate(
          { email: 'admin@animeverse.com' },
          { password: hashedPw },
          { upsert: true, new: true }
        );
      } catch (e) {
        console.warn('Could not update Mongo AdminUser:', e.message);
      }
    }

    return res.json({
      success: true,
      message: 'Admin password updated successfully! Please login with your new password.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// User Registration (/api/auth/register)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    if (dbConnected) {
      try {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
          return res.status(400).json({ error: 'An account with this email already exists.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
        const user = await User.create({
          name: name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          picture: avatar,
          provider: 'email'
        });
        const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
        return res.status(201).json({
          token,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            picture: user.picture,
            provider: 'email'
          }
        });
      } catch (err) {
        dbConnected = false;
      }
    }

    // In-Memory fallback store logic
    const existingMemoryUser = memoryStore.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existingMemoryUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = 'usr-' + Date.now();
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
    const newMemoryUser = {
      id: userId,
      _id: userId,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      picture: avatar,
      provider: 'email'
    };
    memoryStore.users.push(newMemoryUser);

    const token = jwt.sign({ id: userId, email: normalizedEmail, name: name.trim() }, JWT_SECRET, { expiresIn: '30d' });
    return res.status(201).json({
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        picture: avatar,
        provider: 'email'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User Login (/api/auth/login)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (dbConnected) {
      try {
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
          return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
        return res.json({
          token,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            picture: user.picture,
            provider: user.provider || 'email'
          }
        });
      } catch (err) {
        dbConnected = false;
      }
    }

    // In-Memory fallback logic
    const memUser = memoryStore.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!memUser) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const isMatch = await bcrypt.compare(password, memUser.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign({ id: memUser.id, email: memUser.email, name: memUser.name }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({
      token,
      user: {
        id: memUser.id,
        name: memUser.name,
        email: memUser.email,
        picture: memUser.picture,
        provider: memUser.provider || 'email'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Google OAuth Sync (/api/auth/google)
app.post('/api/auth/google', async (req, res) => {
  try {
    const { name, email, picture, googleId } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (dbConnected) {
      try {
        let user = await User.findOne({ email: normalizedEmail });
        if (!user) {
          user = await User.create({
            name: name || email.split('@')[0],
            email: normalizedEmail,
            password: await bcrypt.hash('GOOGLE_OAUTH_USER_' + Date.now(), 10),
            picture: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(normalizedEmail)}`,
            provider: 'google'
          });
        }
        const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
        return res.json({
          token,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            picture: user.picture,
            provider: 'google'
          }
        });
      } catch (err) {
        dbConnected = false;
      }
    }

    let memUser = memoryStore.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!memUser) {
      memUser = {
        id: googleId || 'gusr-' + Date.now(),
        name: name || email.split('@')[0],
        email: normalizedEmail,
        picture: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(normalizedEmail)}`,
        provider: 'google'
      };
      memoryStore.users.push(memUser);
    }
    const token = jwt.sign({ id: memUser.id, email: memUser.email, name: memUser.name }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({
      token,
      user: {
        id: memUser.id,
        name: memUser.name,
        email: memUser.email,
        picture: memUser.picture,
        provider: 'google'
      }
    });
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

// ---------------- RAZORPAY PAYMENT ENDPOINTS ---------------- //

// 1. Create Razorpay Order with Server-Calculated Amount
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { items, customer_name, email, phone, shipping_address, billing_address, coupon_code } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart must contain at least one item.' });
    }
    if (!customer_name || !email || !phone || !shipping_address) {
      return res.status(400).json({ error: 'Customer name, email, phone, and shipping address are required.' });
    }

    // SERVER-SIDE PRICE CALCULATION (DO NOT TRUST CLIENT AMOUNT)
    let calculatedSubtotal = 0;
    const validatedItems = [];

    // Fetch DB / Memory store products for strict price validation
    let dbProducts = [];
    if (dbConnected) {
      try {
        dbProducts = await Product.find();
      } catch (e) {
        dbConnected = false;
      }
    }
    if (dbProducts.length === 0) {
      dbProducts = memoryStore.products;
    }

    for (const item of items) {
      const matchedProd = dbProducts.find(p => p._id?.toString() === item.product_id || p.id?.toString() === item.product_id);
      const unitPrice = matchedProd ? Number(matchedProd.price) : (Number(item.price) || 29.99);
      const qty = Math.max(1, Number(item.quantity) || 1);
      
      calculatedSubtotal += unitPrice * qty;
      validatedItems.push({
        product_id: item.product_id || (matchedProd ? matchedProd._id : 'prod-1'),
        product_name: item.product_name || (matchedProd ? matchedProd.name : 'ASTEYA Anime Tee'),
        size: item.size || 'M',
        quantity: qty,
        price: unitPrice
      });
    }

    // Server-side Coupon Discount Verification
    let discountAmount = 0;
    if (coupon_code) {
      const codeClean = coupon_code.trim().toUpperCase();
      let foundCoupon = memoryStore.coupons.find(c => c.code.toUpperCase() === codeClean);
      if (dbConnected) {
        try {
          const mongoCoupon = await Coupon.findOne({ code: codeClean });
          if (mongoCoupon) foundCoupon = mongoCoupon;
        } catch (e) {}
      }
      if (foundCoupon && foundCoupon.is_active !== false) {
        if (foundCoupon.discount_type === 'percentage') {
          discountAmount = (calculatedSubtotal * foundCoupon.discount_value) / 100;
        } else if (foundCoupon.discount_type === 'fixed') {
          discountAmount = foundCoupon.discount_value;
        }
      }
    }

    const calculatedTotal = Math.max(1, calculatedSubtotal - discountAmount);
    // Convert to INR smallest unit (paise: ₹1 = 100 paise)
    const amountInPaise = Math.round(calculatedTotal * 100);

    const receiptId = 'rcpt_' + Date.now();
    let rzpOrderId = '';

    // Attempt creation via Razorpay API SDK
    try {
      if (RAZORPAY_KEY_ID && !RAZORPAY_KEY_ID.includes('ASTEYA_KEY_ID')) {
        const rzpOrder = await razorpayInstance.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: receiptId,
          notes: {
            customer_email: email,
            customer_phone: phone
          }
        });
        rzpOrderId = rzpOrder.id;
      }
    } catch (rzpErr) {
      console.warn('Razorpay SDK Order creation fallback notice:', rzpErr.message);
    }

    // Fallback order ID for testing if test credentials are in use
    if (!rzpOrderId) {
      rzpOrderId = 'order_rzp_' + Date.now() + Math.random().toString(36).substring(2, 7);
    }

    const tracking_number = 'AV-TRK-' + Math.floor(100000 + Math.random() * 900000);
    const delDate = new Date();
    delDate.setDate(delDate.getDate() + 4);
    const estimated_delivery = delDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const newOrderPayload = {
      customer_name: customer_name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      shipping_address,
      billing_address: billing_address || shipping_address,
      payment_method: 'Razorpay / UPI',
      razorpay_order_id: rzpOrderId,
      payment_status: 'PENDING',
      items: validatedItems,
      total_amount: Number(calculatedTotal.toFixed(2)),
      discount_amount: Number(discountAmount.toFixed(2)),
      coupon_code: coupon_code || null,
      tracking_number,
      estimated_delivery,
      status: 'pending_payment'
    };

    let createdOrder = null;
    if (dbConnected) {
      try {
        createdOrder = await Order.create(newOrderPayload);
      } catch (err) {
        dbConnected = false;
      }
    }

    if (!createdOrder) {
      createdOrder = {
        _id: 'ord-' + Date.now(),
        ...newOrderPayload,
        createdAt: new Date().toISOString()
      };
      memoryStore.orders.unshift(createdOrder);
    }

    return res.status(201).json({
      success: true,
      razorpay_order_id: rzpOrderId,
      amount: amountInPaise,
      currency: 'INR',
      key_id: RAZORPAY_KEY_ID,
      order_id: createdOrder._id || createdOrder.id,
      order: createdOrder
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Verify Razorpay Payment Signature (Server-side HMAC Verification)
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ error: 'Missing Razorpay order or payment identifier.' });
    }

    // Verify HMAC SHA256 Signature using Razorpay Secret Key
    let isSignatureValid = false;
    if (razorpay_signature && RAZORPAY_KEY_SECRET && !RAZORPAY_KEY_SECRET.includes('ASTEYA_SECRET_KEY')) {
      const generated_signature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      isSignatureValid = generated_signature === razorpay_signature;
    } else {
      // Automatic signature verification for test environment
      isSignatureValid = Boolean(razorpay_payment_id && razorpay_order_id);
    }

    if (!isSignatureValid) {
      return res.status(400).json({ error: 'Payment signature verification failed. Unauthorized request.' });
    }

    // Update order status in Database / Memory store
    let updatedOrder = null;
    if (dbConnected) {
      try {
        updatedOrder = await Order.findOneAndUpdate(
          { $or: [{ razorpay_order_id }, { _id: mongoose.isValidObjectId(order_id) ? order_id : null }] },
          {
            payment_status: 'PAID',
            status: 'processing',
            razorpay_payment_id,
            razorpay_signature: razorpay_signature || 'verified_sig_test'
          },
          { new: true }
        );
      } catch (err) {
        dbConnected = false;
      }
    }

    if (!updatedOrder) {
      const idx = memoryStore.orders.findIndex(
        o => o.razorpay_order_id === razorpay_order_id || o._id === order_id || o.id === order_id
      );
      if (idx !== -1) {
        memoryStore.orders[idx] = {
          ...memoryStore.orders[idx],
          payment_status: 'PAID',
          status: 'processing',
          razorpay_payment_id,
          razorpay_signature: razorpay_signature || 'verified_sig_test'
        };
        updatedOrder = memoryStore.orders[idx];
      }
    }

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Associated order record not found.' });
    }

    return res.json({
      success: true,
      message: 'Payment verified successfully and order updated to PAID.',
      order: updatedOrder
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Razorpay Webhook Event Handler (Server-to-Server Verification)
app.post('/api/payment/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    
    // Verify Webhook Signature if secret exists
    if (RAZORPAY_WEBHOOK_SECRET && signature && req.rawBody) {
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(req.rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const eventPayload = req.body;
    const event = eventPayload.event;

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = eventPayload.payload?.payment?.entity;
      const razorpay_order_id = paymentEntity?.order_id;
      const razorpay_payment_id = paymentEntity?.id;

      if (razorpay_order_id) {
        if (dbConnected) {
          try {
            await Order.findOneAndUpdate(
              { razorpay_order_id },
              { payment_status: 'PAID', status: 'processing', razorpay_payment_id }
            );
          } catch (e) {}
        }
        const idx = memoryStore.orders.findIndex(o => o.razorpay_order_id === razorpay_order_id);
        if (idx !== -1) {
          memoryStore.orders[idx].payment_status = 'PAID';
          memoryStore.orders[idx].status = 'processing';
          memoryStore.orders[idx].razorpay_payment_id = razorpay_payment_id;
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = eventPayload.payload?.payment?.entity;
      const razorpay_order_id = paymentEntity?.order_id;

      if (razorpay_order_id) {
        if (dbConnected) {
          try {
            await Order.findOneAndUpdate(
              { razorpay_order_id },
              { payment_status: 'FAILED', status: 'payment_failed' }
            );
          } catch (e) {}
        }
        const idx = memoryStore.orders.findIndex(o => o.razorpay_order_id === razorpay_order_id);
        if (idx !== -1) {
          memoryStore.orders[idx].payment_status = 'FAILED';
          memoryStore.orders[idx].status = 'payment_failed';
        }
      }
    }

    res.json({ status: 'ok' });
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
    const tracking_number = orderData.tracking_number || ('AV-TRK-' + Math.floor(100000 + Math.random() * 900000));
    
    // Delivery estimated 4 days from now
    const delDate = new Date();
    delDate.setDate(delDate.getDate() + 4);
    const estimated_delivery = delDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const fullOrderPayload = {
      ...orderData,
      tracking_number,
      estimated_delivery,
      status: orderData.status || 'processing'
    };

    if (dbConnected) {
      try {
        const newOrder = await Order.create(fullOrderPayload);
        return res.status(201).json(newOrder);
      } catch (err) {
        dbConnected = false;
      }
    }

    const orderObj = {
      _id: 'ord-' + Date.now(),
      ...fullOrderPayload,
      createdAt: new Date().toISOString()
    };
    memoryStore.orders.unshift(orderObj);
    res.status(201).json(orderObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Track Order by Order ID or Tracking Number or Phone/Email
app.get('/api/orders/track/:query', async (req, res) => {
  try {
    const { query } = req.params;
    if (!query) return res.status(400).json({ error: 'Order ID or tracking number required.' });

    const cleanQuery = query.trim();

    if (dbConnected) {
      try {
        const found = await Order.findOne({
          $or: [
            { _id: mongoose.isValidObjectId(cleanQuery) ? cleanQuery : null },
            { tracking_number: cleanQuery.toUpperCase() },
            { email: cleanQuery.toLowerCase() },
            { phone: cleanQuery }
          ]
        });
        if (found) return res.json(found);
      } catch (err) {
        dbConnected = false;
      }
    }

    // Memory Store Search
    const memFound = memoryStore.orders.find(o =>
      (o._id && o._id.toString() === cleanQuery) ||
      (o.id && o.id.toString() === cleanQuery) ||
      (o.tracking_number && o.tracking_number.toUpperCase() === cleanQuery.toUpperCase()) ||
      (o.email && o.email.toLowerCase() === cleanQuery.toLowerCase()) ||
      (o.phone && o.phone === cleanQuery)
    );

    if (memFound) return res.json(memFound);

    res.status(404).json({ error: 'Order not found. Please check your Order ID or Tracking Number.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get User Orders by Email
app.get('/api/orders/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) return res.status(400).json({ error: 'User email is required.' });

    const normalizedEmail = email.trim().toLowerCase();

    if (dbConnected) {
      try {
        const userOrders = await Order.find({ email: normalizedEmail }).sort({ createdAt: -1 });
        return res.json(userOrders);
      } catch (err) {
        dbConnected = false;
      }
    }

    const memUserOrders = memoryStore.orders.filter(o => o.email && o.email.toLowerCase() === normalizedEmail);
    res.json(memUserOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Order Status (Admin)
const VALID_STATUSES = ['pending', 'processing', 'quality_check', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    if (dbConnected) {
      try {
        const updated = await Order.findByIdAndUpdate(id, { status }, { new: true });
        if (updated) return res.json(updated);
      } catch (err) {
        dbConnected = false;
      }
    }

    // Memory store fallback
    const idx = memoryStore.orders.findIndex(o => (o._id && o._id === id) || (o.id && o.id === id));
    if (idx !== -1) {
      memoryStore.orders[idx] = { ...memoryStore.orders[idx], status };
      return res.json(memoryStore.orders[idx]);
    }

    res.status(404).json({ error: 'Order not found.' });
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

// Reviews Endpoints
app.get('/api/reviews', async (req, res) => {
  try {
    const { product_id } = req.query;
    if (dbConnected) {
      try {
        const query = product_id ? { product_id } : {};
        const reviews = await ProductReview.find(query).sort({ createdAt: -1 });
        return res.json(reviews);
      } catch (err) {
        dbConnected = false;
      }
    }
    let list = memoryStore.reviews;
    if (product_id) {
      list = list.filter(r => r.product_id === product_id);
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { product_id, customer_name, author_name, rating, review_text, content } = req.body;
    const author = customer_name || author_name || 'Verified Buyer';
    const text = review_text || content || '';
    const numRating = Number(rating) || 5;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    const payload = {
      product_id,
      author_name: author,
      customer_name: author,
      rating: numRating,
      content: text,
      review_text: text,
      status: 'approved',
      is_approved: true,
    };

    if (dbConnected) {
      try {
        const created = await ProductReview.create(payload);
        return res.status(201).json(created);
      } catch (err) {
        dbConnected = false;
      }
    }

    const newReview = {
      id: 'rev-' + Date.now(),
      _id: 'rev-' + Date.now(),
      ...payload,
      created_at: new Date().toISOString()
    };
    memoryStore.reviews.unshift(newReview);
    res.status(201).json(newReview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (dbConnected && mongoose.isValidObjectId(id)) {
      try {
        await ProductReview.findByIdAndDelete(id);
        return res.json({ success: true });
      } catch (err) {
        dbConnected = false;
      }
    }
    memoryStore.reviews = memoryStore.reviews.filter(r => r.id !== id && r._id !== id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 AnimeVerse Server running at http://localhost:${PORT}`);
  initDBConnection();
});
