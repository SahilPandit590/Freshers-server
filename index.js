require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const fs = require('fs');
const validateRollFormat = require('./middleware/auth.js');
const app = express();
const PORT = process.env.PORT || 3000;

// Connect MongoDB
mongoose.connect(process.env.MONGODB_URI);

// User Schema
const userSchema = new mongoose.Schema({
  roll_number: { type: String, unique: true },
  email: { type: String, unique: true }
});
const User = mongoose.model('User', userSchema);

// Middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Load Images
let images = [];
try { images = JSON.parse(fs.readFileSync('images.json')); } catch(e) {}

// === ROUTES ===

// Home: Login or Register
app.get('/', (req, res) => {
  res.render('auth');
});

app.post('/auth',validateRollFormat, async (req, res) => {
  const { roll_number, email } = req.body;
 
  let user = await User.findOne({ roll_number });
  
  if (user) {
    // Existing user → check email
    if (user.email !== email||user.roll_number!==roll_number) {
      return res.send('Wrong email for this roll. <a href="/">Try again</a>');
    }
  } else {
    // New user → register
    try {
      user = await User.create({ roll_number, email });
    } catch (err) {
      return res.send('Roll or email already used. <a href="/">Try again</a>');
    }
  }

  // Login success
  req.session.loggedin = true;
  req.session.roll = roll_number;
  res.redirect('/gallery');
});

// Gallery
app.get('/gallery', (req, res) => {
  if (!req.session.loggedin) return res.redirect('/');
  res.render('gallery', { images, roll: req.session.roll });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(PORT, () => console.log(`Running on ${PORT}`));