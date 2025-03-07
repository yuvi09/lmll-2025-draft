import express from 'express';
import cors from 'cors';
import { Database } from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
const DB_PATH = 'apps/api-server/db/draft.db';

// Delete database only if --reset-db flag is passed
if (process.argv.includes('--reset-db')) {
  console.log('Resetting database...');
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Database file deleted');
  }
}

const db = new Database(DB_PATH);

app.use(cors());
app.use(express.json()); // Allows JSON request bodies

// Add this interface at the top of the file
interface ColumnInfo {
  name: string;
  type: string;
}

// Add interface for the JSON data structure
interface PlayerRating {
  Grd: string;
  'D#': number;
  Name: string;
  Age: number;
  Batting: number;
  Fiedling: number;
  Throwing: number;
  'YD Notes'?: string;
  'PY Division'?: string;
  Ratg?: string;
  Pos?: string;
  Comments?: string;
}

// Add this function after database initialization
const clearDatabase = () => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Drop existing tables in reverse order due to foreign key constraints
      db.run('DROP TABLE IF EXISTS picks');
      db.run('DROP TABLE IF EXISTS teams');
      db.run('DROP TABLE IF EXISTS players');
      resolve();
    });
  });
};

// Modify the db.serialize section to use clearDatabase first
db.serialize(() => {
  // Clear the database first
  clearDatabase().then(() => {
    // First create the tables with basic structure
    db.run(`
      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        grade INTEGER NOT NULL,
        batting INTEGER NOT NULL,
        pitching INTEGER NOT NULL,
        fielding INTEGER NOT NULL,
        overall INTEGER NOT NULL,
        position TEXT,
        height TEXT,
        weight TEXT,
        bats TEXT,
        throws TEXT,
        notes TEXT
      )
    `);

    // Then add any missing columns
    db.all("PRAGMA table_info(players)", [], (err, rows) => {
      if (err) {
        console.error('Error checking table schema:', err.message);
        return;
      }

      const columnInfo = (Array.isArray(rows) ? rows : []) as ColumnInfo[];
      console.log('Column info:', columnInfo);

      // Chain the ALTER TABLE operations
      const addColumns = () => {
        return new Promise<void>((resolve, reject) => {
          db.serialize(() => {
            if (!columnInfo.some(row => row.name === 'overall')) {
              db.run('ALTER TABLE players ADD COLUMN overall INTEGER');
            }
            if (!columnInfo.some(row => row.name === 'position')) {
              db.run('ALTER TABLE players ADD COLUMN position TEXT');
            }
            if (!columnInfo.some(row => row.name === 'height')) {
              db.run('ALTER TABLE players ADD COLUMN height TEXT');
            }
            if (!columnInfo.some(row => row.name === 'weight')) {
              db.run('ALTER TABLE players ADD COLUMN weight TEXT');
            }
            if (!columnInfo.some(row => row.name === 'bats')) {
              db.run('ALTER TABLE players ADD COLUMN bats TEXT');
            }
            if (!columnInfo.some(row => row.name === 'throws')) {
              db.run('ALTER TABLE players ADD COLUMN throws TEXT');
            }
            if (!columnInfo.some(row => row.name === 'notes')) {
              db.run('ALTER TABLE players ADD COLUMN notes TEXT');
            }
            resolve();
          });
        });
      };

      // Execute the column additions and then continue with seeding
      addColumns().then(() => {
        console.log('Finished adding columns');
        // Teams table to track available teams (numbered 1 through N)
        db.run(`
          CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_number INTEGER NOT NULL UNIQUE
          )
        `);

        // Draft picks table with round information
        db.run(`
          CREATE TABLE IF NOT EXISTS picks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            team_id INTEGER NOT NULL,
            round INTEGER NOT NULL,
            pick_number INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player_id) REFERENCES players(id),
            FOREIGN KEY (team_id) REFERENCES teams(id),
            UNIQUE(player_id),
            UNIQUE(team_id, round)
          )
        `);

        // Seed database with player data if the players table is empty
        db.get('SELECT COUNT(*) as count FROM players', [], (err, result) => {
          if (err) {
            console.error('Error checking players table:', err.message);
            return;
          }
          
          // Only seed if no players exist
          if ((result as {count: number}).count === 0) {
            try {
              const playerDataPath = path.resolve('apps/draft-viewer/src/assets/data/player_ratings.json');
              const playerData = JSON.parse(fs.readFileSync(playerDataPath, 'utf8'));
              
              // Begin transaction for faster inserts
              db.run('BEGIN TRANSACTION');
              
              // Prepare statement with all fields
              const stmt = db.prepare(`
                INSERT INTO players (
                  name, grade, batting, pitching, fielding, overall,
                  position, height, weight, bats, throws, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);
              
              playerData.forEach((player: PlayerRating) => {
                // Map the fields correctly with default values
                const mappedPlayer = {
                  name: player.Name,
                  grade: player.Grd === '2nd' ? 2 : 3,
                  batting: Math.round((player.Batting ?? 1) * 20),
                  pitching: Math.round((player.Throwing ?? 1) * 20),
                  fielding: Math.round((player.Fiedling ?? 1) * 20),
                  position: player.Pos || null,
                  notes: [
                    player.Comments, 
                    player['YD Notes'],
                    player['PY Division'] ? `Previous: ${player['PY Division']}` : null,
                    player.Ratg ? `Rating: ${player.Ratg}` : null
                  ].filter(note => note).join(', ') || null
                };

                // Calculate overall rating
                const overall = Math.round((mappedPlayer.batting + mappedPlayer.pitching + mappedPlayer.fielding) / 3);

                // Log the mapping for debugging
                console.log(`Processing ${mappedPlayer.name}: `, {
                  original: {
                    batting: player.Batting,
                    fielding: player.Fiedling,
                    throwing: player.Throwing
                  },
                  mapped: {
                    batting: mappedPlayer.batting,
                    pitching: mappedPlayer.pitching,
                    fielding: mappedPlayer.fielding,
                    overall
                  }
                });

                stmt.run(
                  mappedPlayer.name.trim(),
                  mappedPlayer.grade,
                  mappedPlayer.batting,
                  mappedPlayer.pitching,
                  mappedPlayer.fielding,
                  overall,
                  mappedPlayer.position?.trim() || null,
                  null, // height
                  null, // weight
                  null, // bats
                  null, // throws
                  mappedPlayer.notes
                );
              });
              
              stmt.finalize();
              
              // Update the teams seeding code
              const NUMBER_OF_TEAMS = 8; // Or however many teams you need
              const teamStmt = db.prepare('INSERT INTO teams (team_number) VALUES (?)');
              
              for (let i = 1; i <= NUMBER_OF_TEAMS; i++) {
                teamStmt.run(i);
              }
              
              teamStmt.finalize();
              
              db.run('COMMIT', [], (err) => {
                if (err) {
                  console.error('Error committing transaction:', err.message);
                } else {
                  console.log(`Database seeded with ${playerData.length} players and ${NUMBER_OF_TEAMS} teams`);
                }
              });
            } catch (error) {
              console.error('Error seeding database:', error);
            }
          } else {
            console.log('Database already contains player data, skipping seed');
          }
        });
      }).catch(err => {
        console.error('Error adding columns:', err);
      });
    });
  });
});

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

// API: Get all teams
app.get('/teams', (req, res) => {
  db.all('SELECT * FROM teams', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Get all draft picks with player and team info
app.get('/picks', (req, res) => {
  db.all(`
    SELECT p.*, pl.name as player_name, pl.grade, pl.overall, t.team_number as team_number
    FROM picks p
    JOIN players pl ON p.player_id = pl.id
    JOIN teams t ON p.team_id = t.id
    ORDER BY p.round, p.pick_number
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Get picks for a specific team
app.get('/picks/team/:teamNumber', (req, res) => {
  const teamNumber = req.params.teamNumber;
  db.all(`
    SELECT p.*, pl.name as player_name, pl.grade, pl.overall
    FROM picks p
    JOIN players pl ON p.player_id = pl.id
    WHERE p.team_id = ?
    ORDER BY p.round
  `, [teamNumber], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Add a new pick
app.post('/picks', (req, res) => {
  const { player_id, team_number, round, pick_number } = req.body;
  
  // First check if player is already drafted
  db.get('SELECT id FROM picks WHERE player_id = ?', [player_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'Player already drafted' });
    
    // Then check if team already has a pick in this round
    db.get('SELECT id FROM picks WHERE team_id = ? AND round = ?', [team_number, round], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) return res.status(400).json({ error: 'Team already has a pick in this round' });
      
      // If all checks pass, insert the pick
      db.run(
        `INSERT INTO picks (player_id, team_id, round, pick_number) VALUES (?, ?, ?, ?)`,
        [player_id, team_number, round, pick_number],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          
          // Return the new pick with player and team info
          db.get(`
            SELECT p.*, pl.name as player_name, pl.grade, pl.overall, t.team_number as team_number
            FROM picks p
            JOIN players pl ON p.player_id = pl.id
            JOIN teams t ON p.team_id = t.id
            WHERE p.id = ?
          `, [this.lastID], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(row);
          });
        }
      );
    });
  });
});

// Start the Express server
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`API Server running at http://localhost:${PORT}`);
});