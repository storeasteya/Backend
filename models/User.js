import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  picture: { type: String },
  provider: { type: String, default: 'email' },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
