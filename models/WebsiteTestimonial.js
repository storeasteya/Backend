import mongoose from 'mongoose';

const WebsiteTestimonialSchema = new mongoose.Schema({
  author: { type: String, required: true },
  text: { type: String, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.models.WebsiteTestimonial || mongoose.model('WebsiteTestimonial', WebsiteTestimonialSchema);
