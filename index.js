  require('dotenv').config();
  const express = require('express');
  const mongoose = require('mongoose');
  const session = require('express-session');
  const fs = require('fs');
  // const validateRollFormat = require('./middleware/auth.js');
  const validateRollFormat = require('./middleware/validaterollformat.js');
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

  let images = [];
  try { images = JSON.parse(fs.readFileSync('images.json')); } catch(e) {}
  let images2024 = [];
  try { images2024 = JSON.parse(fs.readFileSync('images2024.json')); } catch(e) {}



  






  app.get('/', (req, res) => {
    res.render('auth');
  });

  app.post('/auth', validateRollFormat(['24', '25'], ['1','5']), async (req, res) => {
    const roll = req.validatedRoll;  

  
    const batchYear = roll.startsWith('24VD') ? '2024' : '2025';

    await handleAuth(req, res, batchYear);
  });

  
  async function handleAuth(req, res, batch) {
    const { validatedRoll: roll_number } = req;
    const email = req.body.email?.trim().toLowerCase();

    let user = await User.findOne({ roll_number });

    if (user) {
      
      if (user.email !== email) {
        return res.send('Wrong email for this roll number. <a href="/">Try again</a>');
      }
    } else {
  
      try {
        user = await User.create({
          roll_number,
          email,
          batch  
        });
      } catch (err) {
        return res.send('This roll or email is already registered. <a href="/">Try again</a>');
      }
    }

    // Login success
    req.session.loggedin = true;
    req.session.roll = roll_number;
    req.session.batch = batch; // '2024' or '2025'

    
    res.redirect(batch === '2024' ? '/gallery/2024' : '/gallery/2025');
  }






  app.get('/gallery/2024', (req, res) => {
    if (!req.session.loggedin) return res.redirect('/');
    res.render('gallery2024', { images: images2024, roll: req.session?.roll });
  });



  
  app.get('/gallery/2025', async (req, res) => {
    if (!req.session.loggedin) {
      return res.redirect('/');
    }
    res.render('gallery', { 
      images: images, 
      roll: req.session.roll || 'User' 
    });
  });




  app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
  });








  // Add this route anywhere in your Express app (after your other routes)
app.get('/download/:filename', async (req, res) => {
  if (!req.session.loggedin) return res.redirect('/');

  const filename = req.params.filename;
  const imageUrl = `https://throbbing-limit-1136.sahil-pandit-65a.workers.dev/downloads/${filename}`;

  // Optional: Block obvious bad requests
  if (!filename.match(/\.(webp|jpe?g|png)$/i)) {
    return res.status(400).send('Invalid file');
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return res.status(response.status).send('Image not found');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Force download + correct filename + webp support
    res.set({
      'Content-Type': 'image/webp',  // or response.headers.get('content-type')
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*'
    });

    res.send(buffer);
  } catch (err) {
    console.error('Download failed for:', filename, err.message);
    res.status(500).send('Download failed. <a href="/gallery/2025">Go back</a>');
  }
});
  app.listen(PORT, () => console.log(`Running on ${PORT}`));

























