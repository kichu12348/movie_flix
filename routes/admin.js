const express = require('express');
const { db } = require('../database');
const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/');
  }
  next();
};

// Admin dashboard
router.get('/dashboard', isAdmin, (req, res) => {
  db.all('SELECT * FROM movies ORDER BY title', (err, movies) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    res.render('admin_dashboard', { movies });
  });
});

// Add movie page
router.get('/add-movie', isAdmin, (req, res) => {
  res.render('admin_add_movie');
});

// Add movie POST
router.post('/add-movie', isAdmin, (req, res) => {
  const { title, genre } = req.body;

  if (!title || !genre) {
    return res.render('admin_add_movie', { error: 'Title and genre are required' });
  }

  db.run(
    'INSERT INTO movies (title, genre, available_copies) VALUES (?, ?, ?)',
    [title, genre, 5],
    (err) => {
      if (err) {
        return res.render('admin_add_movie', { error: 'Error adding movie' });
      }
      res.redirect('/admin/dashboard');
    }
  );
});

module.exports = router;
