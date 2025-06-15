// Simple Node.js/Express backend for image gallery management
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static('uploads'));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Ensure backup directory exists
const backupDir = path.join(__dirname, 'backup');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Ensure images directory exists
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

// Ensure backup-images directory exists
const backupImagesDir = path.join(__dirname, 'backup-images');
if (!fs.existsSync(backupImagesDir)) {
  fs.mkdirSync(backupImagesDir);
}

// Multer setup for image uploads
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const imageUpload = multer({ storage: imageStorage });

// Configure nodemailer for Gmail (update with your real credentials or app password)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ashbelzichri@gmail.com', // your secret email
    pass: 'YOUR_APP_PASSWORD' // use an app password, not your real password
  }
});

// Image upload endpoint
app.post('/upload-image', imageUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).send('No image uploaded.');
  // Send email notification to owner
  const mailOptions = {
    from: 'ashbelzichri@gmail.com',
    to: 'ashbelzichri@gmail.com',
    subject: 'New Image Message Received',
    text: `A new image was uploaded: ${req.file.filename}`,
    html: `<p>A new image was uploaded: <b>${req.file.filename}</b></p><p><a href="http://localhost:3000/images/${req.file.filename}">View Image</a></p>`
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Email notification failed:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
  res.json({ success: true, filename: req.file.filename });
});

// Admin gallery image upload endpoint (no email, admin-only usage)
app.post('/admin-upload-image', imageUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).send('No image uploaded.');
  // No email notification for admin gallery uploads
  res.json({ success: true, filename: req.file.filename });
});

// Admin: Update (replace) gallery image endpoint
app.post('/update-gallery-image/:filename', imageUpload.single('image'), (req, res) => {
  const filename = req.params.filename;
  if (!req.file) return res.status(400).send('No image uploaded.');
  const destPath = path.join(imagesDir, filename);
  // Overwrite the existing image file
  fs.writeFile(destPath, fs.readFileSync(req.file.path), err => {
    // Remove the temp uploaded file
    fs.unlinkSync(req.file.path);
    if (err) return res.status(500).json({ error: 'Failed to update image.' });
    res.json({ success: true, filename });
  });
});

// Public gallery images listing endpoint
app.get('/gallery-images', (req, res) => {
  fs.readdir(imagesDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to list gallery images.' });
    const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png|gif|webp)$/i));
    // Sort newest first
    imageFiles.sort((a, b) => {
      const aTime = fs.statSync(path.join(imagesDir, a)).mtime.getTime();
      const bTime = fs.statSync(path.join(imagesDir, b)).mtime.getTime();
      return bTime - aTime;
    });
    res.json(imageFiles);
  });
});

// List all uploaded images
app.get('/images', (req, res) => {
  fs.readdir(imagesDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to list images.' });
    const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png|gif|webp)$/i));
    res.json(imageFiles);
  });
});

// Soft delete image endpoint (move to backup-images)
app.post('/delete-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const srcPath = path.join(imagesDir, filename);
  const destPath = path.join(backupImagesDir, filename);
  fs.rename(srcPath, destPath, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to delete (move) image.' });
    res.json({ success: true });
  });
});

// List all backed up images (owner only, secret route)
app.get('/backup-images', (req, res) => {
  fs.readdir(backupImagesDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to list backup images.' });
    const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png|gif|webp)$/i));
    res.json(imageFiles);
  });
});

// Serve uploaded images statically from /images
app.use('/images', express.static(imagesDir));

// Serve backup images statically (owner only, secret route)
app.use('/backup-images', express.static(backupImagesDir));

app.listen(PORT, () => {
  console.log(`Image gallery server running at http://localhost:${PORT}`);
});
