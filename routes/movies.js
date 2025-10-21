const express = require('express');
const { pool } = require('../database');
const router = express.Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'user') {
    return res.redirect('/');
  }
  next();
};

// Movie catalog
router.get('/movies', isAuthenticated, async (req, res) => {
  try {
    const [movies] = await pool.query('SELECT * FROM movies ORDER BY title');
    res.render('movies', { movies });
  } catch (err) {
    return res.status(500).send('Database error');
  }
});

// Rent a movie
router.post('/rent/:movieId', isAuthenticated, async (req, res) => {
  const movieId = req.params.movieId;
  const userId = req.session.user.id;

  const connection = await pool.getConnection();
  
  try {
    const [movies] = await connection.query('SELECT * FROM movies WHERE id = ?', [movieId]);
    const movie = movies[0];

    if (!movie) {
      connection.release();
      return res.status(404).send('Movie not found');
    }

    if (movie.available_copies <= 0) {
      connection.release();
      return res.status(400).send('No copies available');
    }

    // Check if user already has this movie rented
    const [rentals] = await connection.query(
      'SELECT * FROM rentals WHERE user_id = ? AND movie_id = ? AND return_date IS NULL',
      [userId, movieId]
    );

    if (rentals.length > 0) {
      connection.release();
      return res.status(400).send('You already have this movie rented');
    }

    const rentalDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 days from now

    await connection.beginTransaction();

    await connection.query(
      'UPDATE movies SET available_copies = available_copies - 1 WHERE id = ?',
      [movieId]
    );

    await connection.query(
      'INSERT INTO rentals (user_id, movie_id, rental_date, due_date) VALUES (?, ?, ?, ?)',
      [userId, movieId, rentalDate.toISOString(), dueDate.toISOString()]
    );

    await connection.commit();
    connection.release();
    res.redirect('/my-rentals');
  } catch (err) {
    await connection.rollback();
    connection.release();
    return res.status(500).send('Error creating rental');
  }
});

// My rentals page
router.get('/my-rentals', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const [rentals] = await pool.query(
      `SELECT rentals.*, movies.title, movies.genre 
       FROM rentals 
       JOIN movies ON rentals.movie_id = movies.id 
       WHERE rentals.user_id = ? AND rentals.return_date IS NULL
       ORDER BY rentals.due_date`,
      [userId]
    );

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
  } catch (err) {
    return res.status(500).send('Database error');
  }
});

// Return a movie
router.post('/return/:rentalId', isAuthenticated, async (req, res) => {
  const rentalId = req.params.rentalId;
  const userId = req.session.user.id;

  const connection = await pool.getConnection();

  try {
    const [rentals] = await connection.query(
      'SELECT * FROM rentals WHERE id = ? AND user_id = ?',
      [rentalId, userId]
    );
    const rental = rentals[0];

    if (!rental) {
      connection.release();
      return res.status(404).send('Rental not found');
    }

    if (rental.return_date) {
      connection.release();
      return res.status(400).send('Movie already returned');
    }

    const returnDate = new Date();

    await connection.beginTransaction();

    await connection.query(
      'UPDATE rentals SET return_date = ? WHERE id = ?',
      [returnDate.toISOString(), rentalId]
    );

    await connection.query(
      'UPDATE movies SET available_copies = available_copies + 1 WHERE id = ?',
      [rental.movie_id]
    );

    await connection.commit();
    connection.release();
    res.redirect('/my-rentals');
  } catch (err) {
    await connection.rollback();
    connection.release();
    return res.status(500).send('Error returning movie');
  }
});

module.exports = router;
