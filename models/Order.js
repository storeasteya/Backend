import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  product_id: { type: String, required: true },
  product_name: { type: String },
  size: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }
});

const OrderSchema = new mongoose.Schema({
  customer_name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  shipping_address: { type: String, required: true },
  billing_address: { type: String, required: true },
  payment_method: { type: String, default: 'UPI' },
  items: [OrderItemSchema],
  total_amount: { type: Number, required: true },
  discount_amount: { type: Number, default: 0 },
  coupon_code: { type: String },
  status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' }
}, { timestamps: true });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
