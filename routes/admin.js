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

// Edit movie page
router.get('/edit-movie/:id', isAdmin, (req, res) => {
  const movieId = req.params.id;

  db.get('SELECT * FROM movies WHERE id = ?', [movieId], (err, movie) => {
    if (err || !movie) {
      return res.status(404).send('Movie not found');
    }
    res.render('admin_edit_movie', { movie });
  });
});

// Edit movie POST
router.post('/edit-movie/:id', isAdmin, (req, res) => {
  const movieId = req.params.id;
  const { title, genre, available_copies } = req.body;

  if (!title || !genre || available_copies === undefined) {
    return db.get('SELECT * FROM movies WHERE id = ?', [movieId], (err, movie) => {
      res.render('admin_edit_movie', { 
        movie: movie || { id: movieId, title, genre, available_copies },
        error: 'All fields are required' 
      });
    });
  }

  const copies = parseInt(available_copies);
  if (isNaN(copies) || copies < 0) {
    return db.get('SELECT * FROM movies WHERE id = ?', [movieId], (err, movie) => {
      res.render('admin_edit_movie', { 
        movie: movie || { id: movieId, title, genre, available_copies },
        error: 'Available copies must be a valid non-negative number' 
      });
    });
  }

  db.run(
    'UPDATE movies SET title = ?, genre = ?, available_copies = ? WHERE id = ?',
    [title, genre, copies, movieId],
    (err) => {
      if (err) {
        return db.get('SELECT * FROM movies WHERE id = ?', [movieId], (err, movie) => {
          res.render('admin_edit_movie', { 
            movie: movie || { id: movieId, title, genre, available_copies },
            error: 'Error updating movie' 
          });
        });
      }
      res.redirect('/admin/dashboard');
    }
  );
});

// Delete movie with cascade
router.post('/delete-movie/:id', isAdmin, (req, res) => {
  const movieId = req.params.id;

  db.run('BEGIN TRANSACTION');

  // First delete all associated rentals
  db.run('DELETE FROM rentals WHERE movie_id = ?', [movieId], (err) => {
    if (err) {
      db.run('ROLLBACK');
      return res.status(500).send('Error deleting associated rentals');
    }

    // Then delete the movie
    db.run('DELETE FROM movies WHERE id = ?', [movieId], (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).send('Error deleting movie');
      }

      db.run('COMMIT');
      res.redirect('/admin/dashboard');
    });
  });
});

module.exports = router;
