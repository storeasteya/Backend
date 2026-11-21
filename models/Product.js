import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  cross_price: { type: Number, default: 0 },
  original_price: { type: Number, default: 0 },
  image_url: { type: String, required: true },
  secondary_image_url: { type: String, default: '' },
  images: [{ type: String }],
  sizes: [{ type: String }],
  anime_series: { type: String, required: true },
  featured: { type: Boolean, default: false },
  in_stock: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
