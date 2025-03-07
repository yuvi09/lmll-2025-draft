import express from 'express';
import cors from 'cors';
import { Database } from 'sqlite3';

const app = express();
const db = new Database('apps/api-server/db/draft.db'); // SQLite database file

app.use(cors());
app.use(express.json()); // Allows JSON request bodies

// Create tables if they don't exist
db.run(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    grade INTEGER NOT NULL,
    team TEXT NOT NULL,
    batting INTEGER NOT NULL,
    pitching INTEGER NOT NULL,
    fielding INTEGER NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS picks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    team TEXT NOT NULL,
    round INTEGER NOT NULL,
    FOREIGN KEY (player_id) REFERENCES players(id)
  )
`);

// API: Get all players
app.get('/players', (req, res) => {
  db.all('SELECT * FROM players', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Add a new player
app.post('/players', (req, res) => {
  const { name, grade, team, batting, pitching, fielding } = req.body;
  db.run(
    `INSERT INTO players (name, grade, team, batting, pitching, fielding) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, grade, team, batting, pitching, fielding],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// API: Get all draft picks
app.get('/picks', (req, res) => {
  db.all('SELECT * FROM picks', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Add a new pick
app.post('/picks', (req, res) => {
  const { player_id, team, round } = req.body;
  db.run(
    `INSERT INTO picks (player_id, team, round) VALUES (?, ?, ?)`,
    [player_id, team, round],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Start the Express server
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`API Server running at http://localhost:${PORT}`);
});