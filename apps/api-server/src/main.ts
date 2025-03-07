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

// Add this function after database initialization
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
            // First create teams table
            db.run(`
              CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_number INTEGER NOT NULL UNIQUE,
                name TEXT NOT NULL,
                managers TEXT NOT NULL
              )
            `);

            // Then add the teams data
            const stmt = db.prepare(`
              INSERT OR IGNORE INTO teams (team_number, name, managers)
              VALUES (?, ?, ?)
            `);

            teams.forEach(([number, name, managers]) => {
              stmt.run(number, name, managers);
            });

            stmt.finalize();

            // Then add columns to players table if needed
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

            // Add this to the database initialization section
            db.run(`
              CREATE TABLE IF NOT EXISTS draft_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                current_round INTEGER NOT NULL DEFAULT 1,
                current_pick_index INTEGER NOT NULL DEFAULT 0
              )
            `);

            // Initialize draft state if not exists
            db.get('SELECT * FROM draft_state WHERE id = 1', [], (err, row) => {
              if (!row) {
                db.run('INSERT INTO draft_state (id, current_round, current_pick_index) VALUES (1, 1, 0)');
              }
            });

            // Add this to the database initialization section
            db.run(`
              CREATE TABLE IF NOT EXISTS pick_order (
                pick_number INTEGER PRIMARY KEY,
                team_number INTEGER NOT NULL,
                FOREIGN KEY (team_number) REFERENCES teams (team_number)
              )
            `);

            // Initialize pick order if not exists
            const pickOrderData = [
              [1, 11], [2, 6], [3, 4], [4, 5], [5, 8], [6, 3], [7, 1],
              [8, 9], [9, 10], [10, 12], [11, 13], [12, 2], [13, 7]
            ];

            db.get('SELECT COUNT(*) as count FROM pick_order', [], (err, row: any) => {
              if (err || row.count === 0) {
                const stmt = db.prepare('INSERT INTO pick_order (pick_number, team_number) VALUES (?, ?)');
                pickOrderData.forEach(([pick, team]) => stmt.run(pick, team));
                stmt.finalize();
              }
            });

            resolve();
          });
        });
      };

      // Execute the column additions and then continue with seeding
      addColumns().then(() => {
        console.log('Finished adding columns');
        
        // Draft picks table with round information
        db.run(`
          CREATE TABLE IF NOT EXISTS picks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER,
            team_id INTEGER NOT NULL,
            round INTEGER NOT NULL,
            pick_number INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player_id) REFERENCES players (id),
            FOREIGN KEY (team_id) REFERENCES teams (id)
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
              
              db.run('COMMIT', [], (err) => {
                if (err) {
                  console.error('Error committing transaction:', err.message);
                } else {
                  console.log(`Database seeded with ${playerData.length} players and ${teams.length} teams`);
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
      pl.name as player_name,
      pl.grade,
      pl.overall,
      t.team_number,
      t.name as team_name,
      t.managers as team_managers
    FROM picks p
    JOIN players pl ON p.player_id = pl.id
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
      pl.name as player_name,
      pl.grade,
      pl.overall,
      t.name as team_name,
      t.managers as team_managers
    FROM picks p
    JOIN players pl ON p.player_id = pl.id
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

// Start the Express server
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`API Server running at http://localhost:${PORT}`);
});