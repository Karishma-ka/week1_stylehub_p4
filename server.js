const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')('your_stripe_secret_key'); // Replace with your Stripe secret key
const nodemailer = require('nodemailer');

// Initialize Express
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/ecommerce')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema & Model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

// Product Schema & Model
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  imageUrl: String,
});
const Product = mongoose.model('Product', productSchema);

// Order Schema & Model
const orderSchema = new mongoose.Schema({
  userId: String,
  products: Array,
  total: Number,
  createdAt: { type: Date, default: Date.now },
});
const Order = mongoose.model('Order', orderSchema);

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // Change if needed
  auth: {
    user: 'your-email@gmail.com', // Replace with your email
    pass: 'your-email-password', // Replace with your app password
  },
});

// Authentication Middleware
const authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).send('Access denied');
  jwt.verify(token, 'your_jwt_secret', (err, decoded) => {
    if (err) return res.status(400).send('Invalid token');
    req.userId = decoded.userId;
    next();
  });
};

// Routes
// User Registration
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = new User({ email, password });
    await user.save();
    res.status(201).send('User registered');
  } catch (err) {
    res.status(400).send('Error registering user: ' + err.message);
  }
});

// User Login
// Login Log Schema & Model
const loginLogSchema = new mongoose.Schema({
  email: { type: String, required: true },
  loginTime: { type: Date, default: Date.now },
  status: { type: String, enum: ['Success', 'Failure'], required: true },
});
const LoginLog = mongoose.model('LoginLog', loginLogSchema);

// User Login Route (Updated)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Log failed attempt
      await new LoginLog({ email, status: 'Failure' }).save();
      return res.status(400).send('Invalid credentials');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Log failed attempt
      await new LoginLog({ email, status: 'Failure' }).save();
      return res.status(400).send('Invalid credentials');
    }

    const token = jwt.sign({ userId: user._id }, 'your_jwt_secret', { expiresIn: '1h' });

    // Log successful attempt
    await new LoginLog({ email, status: 'Success' }).save();

    res.status(200).json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Add Product (Admin Only)
app.post('/api/products', authenticate, async (req, res) => {
  const { name, description, price, imageUrl } = req.body;
  try {
    const product = new Product({ name, description, price, imageUrl });
    await product.save();
    res.status(201).send('Product added');
  } catch (err) {
    res.status(400).send('Error adding product: ' + err.message);
  }
});

// Get Products
app.get('/api/products', async (req, res) => {
  const products = await Product.find();
  res.status(200).json(products);
});

// Create Payment Intent (Stripe)
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body; // Amount in cents
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method_types: ['card'],
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Place Order
app.post('/api/orders', authenticate, async (req, res) => {
  const { products, total } = req.body;
  try {
    const order = new Order({ userId: req.userId, products, total });
    await order.save();

    // Send Email Confirmation
    const user = await User.findById(req.userId);
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: user.email,
      subject: 'Order Confirmation',
      text: `Thank you for your order! Order total: $${total / 100}.`,
    };
    await transporter.sendMail(mailOptions);

    res.status(201).send('Order placed and confirmation email sent');
  } catch (err) {
    res.status(400).send('Error placing order: ' + err.message);
  }
});

// Get Orders for User
app.get('/api/orders', authenticate, async (req, res) => {
  const orders = await Order.find({ userId: req.userId });
  res.status(200).json(orders);
});

// Start the Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
