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

// Add this AFTER your other middleware and BEFORE your routes
app.use(express.json()); // This is critical for parsing JSON request bodies

const MongoStore = require('connect-mongo'); // Install: npm install connect-mongo



  app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // Lazy session update
  }),
  cookie: {
    secure: false, // Set to true only if using HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Make images global so delete route can update them
let images = [];
try { 
  images = JSON.parse(fs.readFileSync('images.json')); 
  global.images = images;
} catch(e) {
  console.error('Failed to load images.json:', e);
}

let images2024 = [];
try { 
  images2024 = JSON.parse(fs.readFileSync('images2024.json')); 
  global.images2024 = images2024;
} catch(e) {
  console.error('Failed to load images2024.json:', e);
}


  






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






  // app.get('/gallery/2024', (req, res) => {
  //   if (!req.session.loggedin) return res.redirect('/');
  //   res.render('gallery2024', { images: images2024, roll: req.session?.roll });
  // });



  
  // app.get('/gallery/2025', async (req, res) => {
  //   if (!req.session.loggedin) {
  //     return res.redirect('/');
  //   }
  //   res.render('gallery', { 
  //     images: images, 
  //     roll: req.session.roll || 'User' 
  //   });
  // });

app.get('/gallery/2024', (req, res) => {
  if (!req.session.loggedin) return res.redirect('/');
  res.render('gallery2024', { 
    images: images2024, 
    roll: req.session?.roll,
    batch: '2024'  // ADD THIS LINE
  });
});

app.get('/gallery/2025', async (req, res) => {
  if (!req.session.loggedin) {
    return res.redirect('/');
  }
  res.render('gallery', { 
    images: images, 
    roll: req.session.roll || 'User',
    batch: '2025'  // ADD THIS LINE
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
















app.post('/delete-image', async (req, res) => {
  console.log('Delete request received:', req.body);
  console.log('Session loggedin:', req.session.loggedin);
  
  if (!req.session.loggedin) {
    console.log('ERROR: Not logged in');
    return res.status(401).json({ success: false, error: 'Unauthorized - Please refresh and try again' });
  }

  try {
    const { imageName, batch } = req.body;
    
    console.log('ImageName:', imageName);
    console.log('Batch:', batch);
    
    if (!imageName) {
      console.log('ERROR: No imageName provided');
      return res.status(400).json({ success: false, error: 'Image name required' });
    }

    // Determine which file to modify based on batch
    const fileName = batch === '2024' ? 'images2024.json' : 'images.json';

    console.log('Target file:', fileName);

    // Read current images file
    let imagesList = [];
    try {
      imagesList = JSON.parse(fs.readFileSync(fileName, 'utf8'));
      console.log('Total images in file:', imagesList.length);
    } catch (e) {
      console.error('Failed to read file:', e);
      return res.status(500).json({ success: false, error: `Failed to read ${fileName}` });
    }

    // Find the image first to debug
    const foundImage = imagesList.find(img => img.name === imageName);
    console.log('Image found:', foundImage);

    // Find and remove the image
    const initialLength = imagesList.length;
    imagesList = imagesList.filter(img => img.name !== imageName);

    console.log('Images before:', initialLength, 'after:', imagesList.length);

    if (imagesList.length === initialLength) {
      console.log('ERROR: Image not found in array');
      return res.status(404).json({ success: false, error: 'Image not found' });
    }

    // Write back to file
    try {
      fs.writeFileSync(fileName, JSON.stringify(imagesList, null, 2));
      console.log('File updated successfully');
    } catch (e) {
      console.error('Failed to write file:', e);
      return res.status(500).json({ success: false, error: `Failed to update ${fileName}` });
    }

    // Update the in-memory array
    if (batch === '2024') {
      global.images2024 = imagesList;
      images2024 = imagesList;
    } else {
      global.images = imagesList;
      images = imagesList;
    }

    console.log('Delete successful!');
    
    // CRITICAL: Save session before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ success: false, error: 'Session error' });
      }
      res.json({ success: true, message: 'Image deleted successfully' });
    });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});





















  app.listen(PORT, () => console.log(`Running on ${PORT}`));

























