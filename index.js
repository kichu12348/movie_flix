const express = require("express");
const cors = require("cors");
const path = require("path");

const movieRoutes = require("./src/routes/movieRoutes");
const authRoutes = require("./src/routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'frontend',"public")));


app.use("/api/movies", movieRoutes);
app.use("/api/auth", authRoutes);

app.get("/auth", (_, res) => {
  res.sendFile(path.join(__dirname, "frontend", "auth.html"));
});

app.get("/health", (_, res) => {
  res.json({ message: "i am alibeeeeee muahahahahahahahah!!!" });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "movies.html"));
});

app.get("/movies", (req, res) => {
    res.redirect("/");
});

app.get("/auth/user", (req, res) => {
    res.redirect("/auth");
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
