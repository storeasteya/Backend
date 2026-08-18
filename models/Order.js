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
  payment_method: { type: String, default: 'Razorpay / UPI' },
  razorpay_order_id: { type: String },
  razorpay_payment_id: { type: String },
  razorpay_signature: { type: String },
  payment_status: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'], default: 'PENDING' },
  items: [OrderItemSchema],
  total_amount: { type: Number, required: true },
  discount_amount: { type: Number, default: 0 },
  coupon_code: { type: String },
  tracking_number: { type: String },
  estimated_delivery: { type: String },
  status: { 
    type: String, 
    enum: ['pending_payment', 'payment_processing', 'paid', 'pending', 'processing', 'quality_check', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'payment_failed'], 
    default: 'pending_payment' 
  }
}, { timestamps: true });

if (mongoose.models && mongoose.models.Order) {
  delete mongoose.models.Order;
}

export default mongoose.model('Order', OrderSchema);
