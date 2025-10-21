const express = require('express');
const { db } = require('../database');
const router = express.Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'user') {
    return res.redirect('/');
  }
  next();
};

// Movie catalog
router.get('/movies', isAuthenticated, (req, res) => {
  db.all('SELECT * FROM movies ORDER BY title', (err, movies) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    res.render('movies', { movies });
  });
});

// Rent a movie
router.post('/rent/:movieId', isAuthenticated, (req, res) => {
  const movieId = req.params.movieId;
  const userId = req.session.user.id;

  db.get('SELECT * FROM movies WHERE id = ?', [movieId], (err, movie) => {
    if (err || !movie) {
      return res.status(404).send('Movie not found');
    }

    if (movie.available_copies <= 0) {
      return res.status(400).send('No copies available');
    }

    // Check if user already has this movie rented
    db.get(
      'SELECT * FROM rentals WHERE user_id = ? AND movie_id = ? AND return_date IS NULL',
      [userId, movieId],
      (err, rental) => {
        if (rental) {
          return res.status(400).send('You already have this movie rented');
        }

        const rentalDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7); // 7 days from now

        db.run('BEGIN TRANSACTION');

        db.run(
          'UPDATE movies SET available_copies = available_copies - 1 WHERE id = ?',
          [movieId],
          (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).send('Error updating movie');
            }

            db.run(
              'INSERT INTO rentals (user_id, movie_id, rental_date, due_date) VALUES (?, ?, ?, ?)',
              [userId, movieId, rentalDate.toISOString(), dueDate.toISOString()],
              (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).send('Error creating rental');
                }

                db.run('COMMIT');
                res.redirect('/my-rentals');
              }
            );
          }
        );
      }
    );
  });
});

// My rentals page
router.get('/my-rentals', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;

  db.all(
    `SELECT rentals.*, movies.title, movies.genre 
     FROM rentals 
     JOIN movies ON rentals.movie_id = movies.id 
     WHERE rentals.user_id = ? AND rentals.return_date IS NULL
     ORDER BY rentals.due_date`,
    [userId],
    (err, rentals) => {
      if (err) {
        return res.status(500).send('Database error');
      }

      // Calculate late fees
      const now = new Date();
      const rentalsWithFees = rentals.map(rental => {
        const dueDate = new Date(rental.due_date);
        const lateDays = Math.max(0, Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24)));
        const lateFee = lateDays * 5; // ₹5 per day

        return {
          ...rental,
          lateDays,
          lateFee,
          isOverdue: lateDays > 0
        };
      });

      res.render('my_rentals', { rentals: rentalsWithFees });
    }
  );
});

// Return a movie
router.post('/return/:rentalId', isAuthenticated, (req, res) => {
  const rentalId = req.params.rentalId;
  const userId = req.session.user.id;

  db.get('SELECT * FROM rentals WHERE id = ? AND user_id = ?', [rentalId, userId], (err, rental) => {
    if (err || !rental) {
      return res.status(404).send('Rental not found');
    }

    if (rental.return_date) {
      return res.status(400).send('Movie already returned');
    }

    const returnDate = new Date();

    db.run('BEGIN TRANSACTION');

    db.run(
      'UPDATE rentals SET return_date = ? WHERE id = ?',
      [returnDate.toISOString(), rentalId],
      (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).send('Error updating rental');
        }

        db.run(
          'UPDATE movies SET available_copies = available_copies + 1 WHERE id = ?',
          [rental.movie_id],
          (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).send('Error updating movie');
            }

            db.run('COMMIT');
            res.redirect('/my-rentals');
          }
        );
      }
    );
  });
});

module.exports = router;
