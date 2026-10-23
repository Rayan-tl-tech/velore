import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  roles: {
    type: [String],
    enum: ['user', 'admin'],
    default: ['user']
  },
  phone: {
    type: String,
    default: ''
  },
  wilaya: {
    type: String,
    default: ''
  },
  commune: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true
});

// ✅ Vérifier si le modèle existe déjà
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
