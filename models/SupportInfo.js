import mongoose from 'mongoose';

const SupportInfoSchema = new mongoose.Schema({
  section_key: { type: String, required: true, unique: true },
  content: { type: String, required: true }
}, { timestamps: true });

export default mongoose.models.SupportInfo || mongoose.model('SupportInfo', SupportInfoSchema);
