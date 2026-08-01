import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true },
  min_purchase: { type: Number, default: 0 },
  max_discount: { type: Number },
  usage_limit: { type: Number, default: null },
  times_used: { type: Number, default: 0 },
  start_date: { type: Date },
  end_date: { type: Date }
}, { timestamps: true });

export default mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
