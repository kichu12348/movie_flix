const db = require("../../database.js");

exports.getAllMovies = (req, res) => {
  // Get movies for the authenticated user only
  const userId = req.userId;
  const sql = "SELECT * FROM movies WHERE user_id = ? ORDER BY created_at DESC";
  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ movies: rows });
  });
};

exports.createMovie = (req, res) => {
  const { title, genre } = req.body;
  const userId = req.userId;
  
  if (!title || !genre) {
    return res
      .status(400)
      .json({ error: "Missing required fields: title, genre" });
  }
  
  const sql = "INSERT INTO movies (title, genre, user_id) VALUES (?, ?, ?)";
  db.run(sql, [title, genre, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ 
      id: this.lastID, 
      title, 
      genre, 
      user_id: userId,
      is_available: 1,
      created_at: new Date().toISOString()
    });
  });
};

exports.updateMovie = (req, res) => {
  const { title, genre, is_available } = req.body;
  const userId = req.userId;
  const movieId = req.params.id;

  if (!title && !genre && is_available === undefined) {
    return res.status(400).json({ error: "At least one field must be provided for update" });
  }

  // First check if the movie exists and belongs to the user
  const checkSql = "SELECT id FROM movies WHERE id = ? AND user_id = ?";
  db.get(checkSql, [movieId, userId], (err, movie) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!movie) {
      return res.status(404).json({ 
        message: "Movie not found or you don't have permission to update it." 
      });
    }

    // Update only the provided fields
    const sql = `UPDATE movies SET 
                      title = COALESCE(?, title), 
                      genre = COALESCE(?, genre), 
                      is_available = COALESCE(?, is_available) 
                   WHERE id = ? AND user_id = ?`;

    db.run(sql, [title, genre, is_available, movieId, userId], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Get the updated movie to return it
      const selectSql = "SELECT * FROM movies WHERE id = ? AND user_id = ?";
      db.get(selectSql, [movieId, userId], (err, updatedMovie) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
          message: "Movie updated successfully.",
          movie: updatedMovie
        });
      });
    });
  });
};

exports.deleteMovie = (req, res) => {
  const userId = req.userId;
  const movieId = req.params.id;

  // Only delete movies that belong to the authenticated user
  const sql = "DELETE FROM movies WHERE id = ? AND user_id = ?";
  db.run(sql, [movieId, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) {
      return res.status(404).json({ 
        message: "Movie not found or you don't have permission to delete it." 
      });
    }
    res.json({ 
      message: "Movie deleted successfully.",
      deletedMovieId: movieId
    });
  });
};
