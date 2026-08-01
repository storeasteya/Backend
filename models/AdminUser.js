import mongoose from 'mongoose';

const AdminUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true });

export default mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema);
