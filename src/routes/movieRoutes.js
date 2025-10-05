const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movieController");
const verifyToken = require("../middleware/authMiddleware");

// All movie routes now require authentication for user-specific data
router.get("/", verifyToken, movieController.getAllMovies);
router.post("/", verifyToken, movieController.createMovie);
router.put("/:id", verifyToken, movieController.updateMovie);
router.delete("/:id", verifyToken, movieController.deleteMovie);

module.exports = router;
