// routes/blog.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'blog_' + Date.now() + ext);
  }
});
const upload = multer({ storage });

// GET all blog posts
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM blog_posts ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// GET single blog post
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM blog_posts WHERE id=?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// CREATE blog post
router.post('/', upload.single('image'), async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  let image_url = null;
  if (req.file) {
    image_url = '/uploads/' + req.file.filename;
  }

  try {
    const [result] = await db.query(
      'INSERT INTO blog_posts (title, content, image_url) VALUES (?, ?, ?)',
      [title, content, image_url]
    );
    res.status(201).json({ id: result.insertId, title, content, image_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error during post creation.' });
  }
});

// UPDATE blog post
router.put('/:id', upload.single('image'), async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  let image_url = null;
  if (req.file) {
    image_url = '/uploads/' + req.file.filename;
  }

  try {
    const [existing] = await db.query('SELECT * FROM blog_posts WHERE id=?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    let query = 'UPDATE blog_posts SET title=?, content=?';
    let params = [title, content];
    if (image_url) {
      query += ', image_url=?';
      params.push(image_url);
    }
    query += ' WHERE id=?';
    params.push(req.params.id);

    await db.query(query, params);
    res.json({ message: 'Updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error during update.' });
  }
});

// DELETE blog post
router.delete('/:id', async (req, res) => {
  try {
    const [existing] = await db.query('SELECT * FROM blog_posts WHERE id=?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    await db.query('DELETE FROM blog_posts WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;
