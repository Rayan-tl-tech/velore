import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  size: {
    type: String,
    default: 'M'
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required']
  },
  customerPhone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  customerEmail: {
    type: String,
    default: ''
  },
  wilaya: {
    type: String,
    required: [true, 'Wilaya is required']
  },
  commune: {
    type: String,
    required: [true, 'Commune is required']
  },
  shippingAddress: {
    type: String,
    required: [true, 'Shipping address is required']
  },
  deliveryMethod: {
    type: String,
    enum: ['home', 'desk'],
    default: 'home'
  },
  shippingFee: {
    type: Number,
    default: 0
  },
  guestAccessToken: {
    type: String,
    default: null
  },
  items: [orderItemSchema],
  totalPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ guestAccessToken: 1 });

export default mongoose.model('Order', orderSchema);
