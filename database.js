const pool = require('./connection');
const bcrypt = require('bcryptjs');

// Initialize database tables and seed data
const initializeDatabase = async () => {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 Dropping existing tables...');
    
    await connection.query('DROP TABLE IF EXISTS rentals');
    await connection.query('DROP TABLE IF EXISTS movies');
    await connection.query('DROP TABLE IF EXISTS users');
    
    console.log('✓ Tables dropped successfully');
    console.log('🔄 Creating fresh tables...');

    // Create users table
    await connection.query(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL DEFAULT 'user'
      )
    `);

    // Create movies table
    await connection.query(`
      CREATE TABLE movies (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        genre VARCHAR(255) NOT NULL,
        available_copies INT NOT NULL DEFAULT 5
      )
    `);

    // Create rentals table
    await connection.query(`
      CREATE TABLE rentals (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        movie_id INT NOT NULL,
        rental_date DATETIME NOT NULL,
        due_date DATETIME NOT NULL,
        return_date DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (movie_id) REFERENCES movies(id)
      )
    `);

    console.log('✓ Tables created successfully');
    console.log('🔄 Seeding data...');

    // Seed admin user
    const hashedPassword = bcrypt.hashSync('admin', 10);
    await connection.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['admin', hashedPassword, 'admin']
    );
    console.log('✓ Admin user created (username: admin, password: admin)');

    // Seed sample movies
    const sampleMovies = [
      ['The Shawshank Redemption', 'Drama', 5],
      ['The Godfather', 'Crime', 5],
      ['The Dark Knight', 'Action', 5],
      ['Inception', 'Sci-Fi', 5],
      ['Pulp Fiction', 'Crime', 5]
    ];

    for (const movie of sampleMovies) {
      await connection.query('INSERT INTO movies (title, genre, available_copies) VALUES (?, ?, ?)', movie);
    }
    console.log(`✓ ${sampleMovies.length} sample movies added successfully`);
    
  } finally {
    connection.release();
  }
};

module.exports = { pool, initializeDatabase };
