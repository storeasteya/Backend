import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import readline from 'readline';
import dotenv from 'dotenv';
dotenv.config();

import Product from '../models/Product.js';
import WebsiteTestimonial from '../models/WebsiteTestimonial.js';
import SupportInfo from '../models/SupportInfo.js';
import Coupon from '../models/Coupon.js';
import AdminUser from '../models/AdminUser.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/animeverse';

const products = [
  {
    name: 'Goku Super Saiyan Aura Tee',
    description: 'Heavyweight 240 GSM organic cotton t-shirt with high-density glowing Saiyan aura graphic.',
    price: 29.99,
    image_url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    anime_series: 'Dragon Ball Z',
    featured: true,
    in_stock: true
  },
  {
    name: 'Solo Leveling Shadow Monarch Tee',
    description: 'Dark aesthetic streetwear tee featuring Sung Jinwoo shadow extraction artwork.',
    price: 34.99,
    image_url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&auto=format&fit=crop&q=80',
    sizes: ['M', 'L', 'XL', 'XXL'],
    anime_series: 'Solo Leveling',
    featured: true,
    in_stock: true
  },
  {
    name: 'Akatsuki Red Cloud Oversized Tee',
    description: 'Iconic Naruto Akatsuki red cloud emblem embroidered on premium drop-shoulder black cotton.',
    price: 27.99,
    image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
    sizes: ['S', 'M', 'L', 'XL'],
    anime_series: 'Naruto',
    featured: true,
    in_stock: true
  },
  {
    name: 'Gojo Infinite Void Graphic Tee',
    description: 'Jujutsu Kaisen Satoru Gojo Domain Expansion glowing eyes high-resolution graphic.',
    price: 32.99,
    image_url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80',
    sizes: ['S', 'M', 'L', 'XL'],
    anime_series: 'Jujutsu Kaisen',
    featured: true,
    in_stock: true
  },
  {
    name: 'Survey Corps Wings of Freedom Tee',
    description: 'Attack on Titan green and blue Wings of Freedom shield print on vintage charcoal fabric.',
    price: 28.99,
    image_url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&auto=format&fit=crop&q=80',
    sizes: ['S', 'M', 'L', 'XL'],
    anime_series: 'Attack on Titan',
    featured: false,
    in_stock: true
  },
  {
    name: 'Straw Hat Jolly Roger Vintage Tee',
    description: 'One Piece Monkey D. Luffy pirate flag print with distressed vintage wash finish.',
    price: 25.99,
    image_url: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&auto=format&fit=crop&q=80',
    sizes: ['S', 'M', 'L', 'XL'],
    anime_series: 'One Piece',
    featured: true,
    in_stock: true
  }
];

const testimonials = [
  { author: 'Sam T.', text: 'Best quality anime shirts I have found! The fabric is thick and print stays intact.', active: true },
  { author: 'Lila M.', text: 'Fast shipping to Mumbai and the sizing is spot on. Definitely ordering again!', active: true },
  { author: 'David L.', text: 'The Akatsuki shirt is top notch streetwear. Highly recommended.', active: true }
];

const supportInfo = [
  { section_key: 'contact', content: 'Email: support@animeverse.com | Phone: +91 9685982012' },
  { section_key: 'shipping', content: 'Free shipping on orders over ₹999. Standard delivery takes 3-5 business days.' },
  { section_key: 'returns', content: '14-day return policy for unwashed and unworn items with video proof.' },
  { section_key: 'payment', content: 'We accept UPI, Credit/Debit Cards, NetBanking, and Cash on Delivery.' }
];

const coupons = [
  { code: 'ANIME10', type: 'percentage', value: 10 },
  { code: 'SAVE500', type: 'fixed', value: 500, min_purchase: 1500 }
];

async function runSeed(adminPassword = 'admin123') {
  try {
    console.log("Connecting to MongoDB:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log("Successfully connected to MongoDB.");

    await Product.deleteMany({});
    await WebsiteTestimonial.deleteMany({});
    await SupportInfo.deleteMany({});
    await Coupon.deleteMany({});
    await AdminUser.deleteMany({});

    await Product.insertMany(products);
    await WebsiteTestimonial.insertMany(testimonials);
    await SupportInfo.insertMany(supportInfo);
    await Coupon.insertMany(coupons);

    const hashedPw = await bcrypt.hash(adminPassword, 10);
    await AdminUser.create({ email: 'admin@animeverse.com', password: hashedPw });

    console.log("✅ Seed completed successfully!");
    console.log("Admin Email: admin@animeverse.com");
    console.log("Admin Password:", adminPassword);
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error.message);
    process.exit(1);
  }
}

if (process.argv.includes('--auto')) {
  runSeed('admin123');
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter admin password to seed (default: admin123): ', (password) => {
    runSeed(password || 'admin123');
  });
}
