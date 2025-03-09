import express from 'express';
import cors from 'cors';
import { Database } from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
const DB_PATH = process.env.DB_PATH || './data/draft.db';

// Add this helper function at the top of the file
function findProjectRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== '/') {
    if (fs.existsSync(path.join(currentDir, 'nx.json'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error('Could not find project root');
}

const PROJECT_ROOT = findProjectRoot(process.cwd());

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Move clearDatabase function definition to the top
const clearDatabase = () => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Drop existing tables in reverse order due to foreign key constraints
      db.run('DROP TABLE IF EXISTS picks');
      db.run('DROP TABLE IF EXISTS teams');
      db.run('DROP TABLE IF EXISTS players');
      db.run('DROP TABLE IF EXISTS draft_state');
      db.run('DROP TABLE IF EXISTS pick_order');
      resolve();
    });
  });
};

// Enable WAL mode for better reliability
db.run('PRAGMA journal_mode = WAL');

// Move initialization logic to a function
function initializeDatabase(shouldSeed = true) {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      try {
        // Create tables
        db.run(`CREATE TABLE IF NOT EXISTS players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          grade INTEGER NOT NULL,
          batting INTEGER NOT NULL,
          pitching INTEGER NOT NULL,
          fielding INTEGER NOT NULL,
          overall INTEGER NOT NULL,
          draft_number INTEGER,
          position TEXT,
          mc_batting INTEGER,
          mc_fielding INTEGER,
          mc_pitching INTEGER,
          mc_overall INTEGER,
          yd_batting INTEGER,
          yd_fielding INTEGER,
          yd_pitching INTEGER,
          age REAL,
          py_division TEXT,
          rating TEXT,
          notes TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS teams (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          team_number INTEGER NOT NULL UNIQUE,
          name TEXT NOT NULL,
          managers TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS picks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_id INTEGER,
          team_id INTEGER NOT NULL,
          round INTEGER NOT NULL,
          pick_number INTEGER NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (player_id) REFERENCES players (id),
          FOREIGN KEY (team_id) REFERENCES teams (id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS draft_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          current_round INTEGER NOT NULL DEFAULT 1,
          current_pick_index INTEGER NOT NULL DEFAULT 0
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS pick_order (
          pick_number INTEGER PRIMARY KEY,
          team_number INTEGER NOT NULL,
          FOREIGN KEY (team_number) REFERENCES teams (team_number)
        )`);

        if (shouldSeed) {
          // Seed teams first - teams array already has the correct order
          teams.forEach(([number, name, managers]) => {
            db.run('INSERT OR IGNORE INTO teams (team_number, name, managers) VALUES (?, ?, ?)',
              [number, name, managers]);
          });

          // Initialize draft state
          db.run('INSERT OR IGNORE INTO draft_state (id, current_round, current_pick_index) VALUES (1, 1, 0)');

          // Generate pick order from teams array - maintains the order teams are defined in
          teams.forEach(([teamNumber], index) => {
            db.run('INSERT OR IGNORE INTO pick_order (pick_number, team_number) VALUES (?, ?)',
              [index + 1, teamNumber]);
          });

          // Read player data from file using absolute path from project root
          const playerDataPath = path.join(
            PROJECT_ROOT,
            'apps/draft-viewer/src/assets/data/player_ratings_combined.json'
          );
          
          console.log('Current directory:', process.cwd());
          console.log('Project root:', PROJECT_ROOT);
          console.log('Loading player data from:', playerDataPath);
          
          const playerData = JSON.parse(fs.readFileSync(playerDataPath, 'utf8')) as PlayerRating[];
          
          playerData.forEach((player: PlayerRating) => {
            db.run(`
              INSERT OR IGNORE INTO players (
                name, grade, batting, pitching, fielding, overall, draft_number,
                position, mc_batting, mc_fielding, mc_pitching, mc_overall,
                yd_batting, yd_fielding, yd_pitching, age, py_division, rating, notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              player.Name,
              parseInt(player.Grd),
              player['MC-Bat'] || 0,
              player['MC-Pitch'] || 0,
              player['MC-Field'] || 0,
              player['MC-Ovr'] || 0,
              player['D#'],
              player.Pos,
              player['MC-Bat'],
              player['MC-Field'],
              player['MC-Pitch'],
              player['MC-Ovr'],
              player['YD-Bat'],
              player['YD-Field'],
              player['YD-Pitch'],
              player.Age,
              player['PY Division'],
              player.Ratg,
              player.Comments
            ]);
          });
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Update how we use initializeDatabase
if (process.argv.includes('--reset-db')) {
  console.log('Resetting database...');
  clearDatabase()
    .then(() => initializeDatabase(true))
    .then(() => console.log('Database initialized'))
    .catch(err => console.error('Error initializing database:', err));
} else {
  initializeDatabase(false)
    .then(() => console.log('Database checked/initialized'))
    .catch(err => console.error('Error checking database:', err));
}

app.use(cors());
app.use(express.json()); // Allows JSON request bodies

// Add these interfaces at the top of the file
interface ColumnInfo {
  name: string;
  type: string;
}

interface Team {
  id: number;
  team_number: number;
  name: string;
  managers: string;
}

interface DbTeam {
  id: number;
}

// Update the interface to include all fields
interface PlayerRating {
  Grd: string;
  'D#': number;
  Name: string;
  Age: number;
  'MC-Bat': number;
  'MC-Field': number;
  'MC-Pitch': number;
  'MC-Ovr': number;
  'YD-Bat': number;
  'YD-Field': number;
  'YD-Pitch': number;
  'YD Notes'?: string;
  'PY Division'?: string;
  Ratg?: string;
  Pos?: string;
  Comments?: string;
}

// Move teams array to the top level scope
const teams = [
  [11, 'Team 11', 'DeSimone, Pasqua, Seeman'],
  [6, 'Team 6', 'Candela, Dodia, Kuker'],
  [4, 'Team 4', 'Green, McGrath, Schumaker'],
  [5, 'Team 5', 'Centre, Faranda, Helfst'],
  [8, 'Team 8', 'Drummond, Griffel, Oleson'],
  [3, 'Team 3', 'Felder, Sigel, Staub'],
  [1, 'Team 1', 'Almodovar, Billig, Krafft'],
  [9, 'Team 9', 'Corritori, Lederman, Lewis'],
  [10, 'Team 10', 'Binder, List, Verrelli'],
  [12, 'Team 12', 'Flahive, Gianutsos, Zalon'],
  [13, 'Team 13', 'Spinelli, Koizim'],
  [2, 'Team 2', 'Gedney, Kohlasch, Paonessa'],
  [7, 'Team 7', 'Diskin, Fitzpatrick']
] as const;

// API: Get all players
app.get('/players', (req, res) => {
  db.all('SELECT * FROM players ORDER BY overall DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Get players by grade
app.get('/players/grade/:grade', (req, res) => {
  const grade = req.params.grade;
  db.all('SELECT * FROM players WHERE grade = ? ORDER BY overall DESC', [grade], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Get top players by grade
app.get('/players/top/:grade/:limit', (req, res) => {
  const grade = req.params.grade;
  const limit = req.params.limit || 10;
  db.all('SELECT * FROM players WHERE grade = ? ORDER BY overall DESC LIMIT ?', 
    [grade, limit], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
  });
});

// API: Get all teams (updated to include all fields)
app.get('/teams', (req, res) => {
  db.all(`
    SELECT id, team_number, name, managers 
    FROM teams 
    ORDER BY team_number
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Get all draft picks (updated to include team name and managers)
app.get('/picks', (req, res) => {
  db.all(`
    SELECT 
      p.*,
      COALESCE(pl.name, 'Skipped Pick') as player_name,
      COALESCE(pl.grade, 0) as grade,
      COALESCE(pl.overall, 0) as overall,
      t.team_number,
      t.name as team_name,
      t.managers as team_managers
    FROM picks p
    LEFT JOIN players pl ON p.player_id = pl.id
    JOIN teams t ON p.team_id = t.id
    ORDER BY p.round, p.pick_number
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Get picks for a specific team (updated to include team details)
app.get('/picks/team/:teamNumber', (req, res) => {
  const teamNumber = req.params.teamNumber;
  db.all(`
    SELECT 
      p.*,
      COALESCE(pl.name, 'Skipped Pick') as player_name,
      COALESCE(pl.grade, 0) as grade,
      COALESCE(pl.overall, 0) as overall,
      t.name as team_name,
      t.managers as team_managers
    FROM picks p
    LEFT JOIN players pl ON p.player_id = pl.id
    JOIN teams t ON p.team_id = t.id
    WHERE t.team_number = ?
    ORDER BY p.round
  `, [teamNumber], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Add a new pick (updated to use team_number for lookup)
app.post('/picks', (req, res) => {
  const { player_id, team_number, round, pick_number } = req.body;
  
  console.log('Received pick request:', { player_id, team_number, round, pick_number });
  
  db.get<Team>('SELECT id FROM teams WHERE team_number = ?', [team_number], (err, team) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!team) return res.status(400).json({ error: 'Team not found' });
    
    const team_id = (team as Team).id;  // Type assertion here
    
    // Skip player validation if it's a skipped pick (player_id === -1)
    if (player_id === -1) {
      insertPick();
    } else {
      // Check if player is already drafted
      db.get('SELECT id FROM picks WHERE player_id = ?', [player_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(400).json({ error: 'Player already drafted' });
        insertPick();
      });
    }

    function insertPick() {
      // Check if team already has a pick in this round
      db.get('SELECT id FROM picks WHERE team_id = ? AND round = ?', [team_id, round], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(400).json({ error: 'Team already has a pick in this round' });
        
        // Insert the pick (null for player_id if skipped)
        const finalPlayerId = player_id === -1 ? null : player_id;
        db.run(
          `INSERT INTO picks (player_id, team_id, round, pick_number) VALUES (?, ?, ?, ?)`,
          [finalPlayerId, team_id, round, pick_number],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Return the new pick with all details
            db.get(`
              SELECT 
                p.*,
                COALESCE(pl.name, 'SKIPPED') as player_name,
                COALESCE(pl.grade, 0) as grade,
                COALESCE(pl.overall, 0) as overall,
                t.team_number,
                t.name as team_name,
                t.managers as team_managers
              FROM picks p
              LEFT JOIN players pl ON p.player_id = pl.id
              JOIN teams t ON p.team_id = t.id
              WHERE p.id = ?
            `, [this.lastID], (err, row) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json(row);
            });
          }
        );
      });
    }
  });
});

// API: Delete all picks
app.delete('/picks', (req, res) => {
  db.run('DELETE FROM picks', [], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'All picks cleared successfully' });
  });
});

// Add these new API endpoints
app.get('/draft-state', (req, res) => {
  db.get('SELECT current_round, current_pick_index FROM draft_state WHERE id = 1', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.put('/draft-state', (req, res) => {
  const { current_round, current_pick_index } = req.body;
  db.run(
    'UPDATE draft_state SET current_round = ?, current_pick_index = ? WHERE id = 1',
    [current_round, current_pick_index],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ current_round, current_pick_index });
    }
  );
});

// Add new API endpoint to get pick order
app.get('/pick-order', (req, res) => {
  db.all(`
    SELECT 
      po.pick_number,
      po.team_number,
      t.managers
    FROM pick_order po
    JOIN teams t ON po.team_number = t.team_number
    ORDER BY po.pick_number
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Update debug endpoint to include comments
app.get('/players/debug/:name', (req, res) => {
  const name = req.params.name;
  db.get(`
    SELECT name, mc_pitching, yd_pitching, mc_overall, notes, position, py_division 
    FROM players 
    WHERE name LIKE ?
  `, [`%${name}%`], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// Add this debug endpoint after other endpoints
app.get('/debug/pick-order', (req, res) => {
  db.all(`
    SELECT 
      po.pick_number,
      po.team_number,
      t.name,
      t.managers
    FROM pick_order po
    JOIN teams t ON po.team_number = t.team_number
    ORDER BY po.pick_number
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Start the Express server
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`API Server running at http://localhost:${PORT}`);
});