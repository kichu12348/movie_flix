const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'movie_rental.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables and seed data
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user'
        )
      `);

      // Create movies table
      db.run(`
        CREATE TABLE IF NOT EXISTS movies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          genre TEXT NOT NULL,
          available_copies INTEGER NOT NULL DEFAULT 5
        )
      `);

      // Create rentals table
      db.run(`
        CREATE TABLE IF NOT EXISTS rentals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          movie_id INTEGER NOT NULL,
          rental_date DATETIME NOT NULL,
          due_date DATETIME NOT NULL,
          return_date DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (movie_id) REFERENCES movies(id)
        )
      `);

      // Seed admin user
      db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          const hashedPassword = bcrypt.hashSync('admin', 10);
          db.run(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            ['admin', hashedPassword, 'admin'],
            (err) => {
              if (err) console.error('Error creating admin user:', err);
              else console.log('✓ Admin user created successfully');
            }
          );
        }
      });

      // Seed sample movies
      db.get('SELECT COUNT(*) as count FROM movies', (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count === 0) {
          const sampleMovies = [
            ['The Shawshank Redemption', 'Drama', 5],
            ['The Godfather', 'Crime', 5],
            ['The Dark Knight', 'Action', 5],
            ['Inception', 'Sci-Fi', 5],
            ['Pulp Fiction', 'Crime', 5]
          ];

          const stmt = db.prepare('INSERT INTO movies (title, genre, available_copies) VALUES (?, ?, ?)');
          sampleMovies.forEach(movie => {
            stmt.run(movie);
          });
          stmt.finalize(() => {
            console.log('✓ Sample movies added successfully');
          });
        }
      });

      resolve();
    });
  });
};

module.exports = { db, initializeDatabase };
