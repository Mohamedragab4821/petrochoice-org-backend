const express = require('express');
const cors = require('cors');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // For serving logo/icon
app.use('/api/blog', require('./routes/blog'));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// GET website settings
app.get('/api/settings', (req, res) => {
  db.query('SELECT * FROM settings WHERE id = 1', (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0]);
  });
});

// POST/PUT update settings
app.post('/api/settings', upload.fields([{ name: 'logo' }, { name: 'icon' }]), (req, res) => {
  const { site_name } = req.body;
  const logo = req.files.logo?.[0]?.filename;
  const icon = req.files.icon?.[0]?.filename;

  const sql = `UPDATE settings SET site_name = ?, logo = ?, icon = ? WHERE id = 1`;
  db.query(sql, [site_name, logo, icon], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Updated successfully' });
  });
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
