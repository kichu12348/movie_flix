const express = require('express');
const { pool } = require('../database');
const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/');
  }
  next();
};

// Admin dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    const [movies] = await pool.query('SELECT * FROM movies ORDER BY title');
    res.render('admin_dashboard', { movies });
  } catch (err) {
    return res.status(500).send('Database error');
  }
});

// Add movie page
router.get('/add-movie', isAdmin, (req, res) => {
  res.render('admin_add_movie');
});

// Add movie POST
router.post('/add-movie', isAdmin, async (req, res) => {
  const { title, genre } = req.body;

  if (!title || !genre) {
    return res.render('admin_add_movie', { error: 'Title and genre are required' });
  }

  try {
    await pool.query(
      'INSERT INTO movies (title, genre, available_copies) VALUES (?, ?, ?)',
      [title, genre, 5]
    );
    res.redirect('/admin/dashboard');
  } catch (err) {
    return res.render('admin_add_movie', { error: 'Error adding movie' });
  }
});

// Edit movie page
router.get('/edit-movie/:id', isAdmin, async (req, res) => {
  const movieId = req.params.id;

  try {
    const [movies] = await pool.query('SELECT * FROM movies WHERE id = ?', [movieId]);
    const movie = movies[0];

    if (!movie) {
      return res.status(404).send('Movie not found');
    }
    res.render('admin_edit_movie', { movie });
  } catch (err) {
    return res.status(404).send('Movie not found');
  }
});

// Edit movie POST
router.post('/edit-movie/:id', isAdmin, async (req, res) => {
  const movieId = req.params.id;
  const { title, genre, available_copies } = req.body;

  if (!title || !genre || available_copies === undefined) {
    const [movies] = await pool.query('SELECT * FROM movies WHERE id = ?', [movieId]);
    return res.render('admin_edit_movie', { 
      movie: movies[0] || { id: movieId, title, genre, available_copies },
      error: 'All fields are required' 
    });
  }

  const copies = parseInt(available_copies);
  if (isNaN(copies) || copies < 0) {
    const [movies] = await pool.query('SELECT * FROM movies WHERE id = ?', [movieId]);
    return res.render('admin_edit_movie', { 
      movie: movies[0] || { id: movieId, title, genre, available_copies },
      error: 'Available copies must be a valid non-negative number' 
    });
  }

  try {
    await pool.query(
      'UPDATE movies SET title = ?, genre = ?, available_copies = ? WHERE id = ?',
      [title, genre, copies, movieId]
    );
    res.redirect('/admin/dashboard');
  } catch (err) {
    const [movies] = await pool.query('SELECT * FROM movies WHERE id = ?', [movieId]);
    res.render('admin_edit_movie', { 
      movie: movies[0] || { id: movieId, title, genre, available_copies },
      error: 'Error updating movie' 
    });
  }
});

// Delete movie with cascade
router.post('/delete-movie/:id', isAdmin, async (req, res) => {
  const movieId = req.params.id;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // First delete all associated rentals
    await connection.query('DELETE FROM rentals WHERE movie_id = ?', [movieId]);

    // Then delete the movie
    await connection.query('DELETE FROM movies WHERE id = ?', [movieId]);

    await connection.commit();
    connection.release();
    res.redirect('/admin/dashboard');
  } catch (err) {
    await connection.rollback();
    connection.release();
    return res.status(500).send('Error deleting movie');
  }
});

module.exports = router;
