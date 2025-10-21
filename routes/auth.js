const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../database');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('index', { error: 'Username and password are required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const [result] = await pool.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, 'user']
    );

    req.session.user = {
      id: result.insertId,
      username: username,
      role: 'user'
    };
    res.redirect('/movies');
  } catch (err) {
    return res.render('index', { error: 'Username already exists' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('index', { error: 'Username and password are required' });
  }

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = users[0];

    if (!user) {
      return res.render('index', { error: 'Invalid username or password' });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.render('index', { error: 'Invalid username or password' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    if (user.role === 'admin') {
      res.redirect('/admin/dashboard');
    } else {
      res.redirect('/movies');
    }
  } catch (err) {
    return res.render('index', { error: 'Invalid username or password' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
