const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const router = express.Router();

// Register
router.post('/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('index', { error: 'Username and password are required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, hashedPassword, 'user'],
    function(err) {
      if (err) {
        return res.render('index', { error: 'Username already exists' });
      }

      req.session.user = {
        id: this.lastID,
        username: username,
        role: 'user'
      };
      res.redirect('/movies');
    }
  );
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('index', { error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
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
  });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
