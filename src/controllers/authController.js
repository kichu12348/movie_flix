const db = require("../../database.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required." });
  }

  db.get("SELECT id FROM users WHERE username = ?", [username], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      return res.status(409).json({ error: "Username already exists." });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);
    const sql = "INSERT INTO users (username, password) VALUES (?, ?)";

    db.run(sql, [username, hashedPassword], function (err) {
      if (err) {
        if (err.code === "SQLITE_CONSTRAINT") {
          return res.status(409).json({ error: "Username already exists." });
        }
        return res.status(500).json({ error: err.message });
      }

      const token = jwt.sign({ id: this.lastID }, process.env.JWT_SECRET);

      res
        .status(201)
        .json({ message: "User registered successfully!", token, auth: true });
    });
  });
};

exports.login = (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT * FROM users WHERE username = ?";

  db.get(sql, [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ message: "User not found." });

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res
        .status(401)
        .send({ auth: false, token: null, message: "Invalid Password!" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

    res.status(200).send({ auth: true, token: token });
  });
};
