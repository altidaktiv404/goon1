const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'network_test.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      plan_type TEXT DEFAULT 'none',
      credits_used INTEGER DEFAULT 0,
      credit_limit INTEGER DEFAULT 100,
      plan_expires_at DATETIME,
      is_blocked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  // Test methods table
  db.run(`
    CREATE TABLE IF NOT EXISTS test_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // API endpoints table
  db.run(`
    CREATE TABLE IF NOT EXISTS api_endpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      method_id INTEGER,
      api_url TEXT NOT NULL,
      username TEXT,
      api_key TEXT,
      priority INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (method_id) REFERENCES test_methods(id)
    )
  `);

  // Test results table
  db.run(`
    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      method_id INTEGER,
      target_address TEXT,
      port INTEGER,
      duration INTEGER,
      status TEXT,
      result_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (method_id) REFERENCES test_methods(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating tables:', err);
    } else {
      console.log('Database tables created successfully');
      seedInitialData();
    }
  });
}

function seedInitialData() {
  // Check if admin exists
  db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
    if (!row) {
      // Create default admin user
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.run(`
        INSERT INTO users (username, email, password, role, plan_type, credit_limit, plan_expires_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+365 days'))
      `, ['admin', 'admin@networktest.com', hashedPassword, 'super_admin', 'vip', 0]);
      console.log('Default admin user created');
    }
  });

  // Seed test methods
  const testMethods = [
    { name: 'TCP Flood', description: 'TCP pakke oversvømmelse test', icon: '🌊', color: '#ef4444' },
    { name: 'UDP Flood', description: 'UDP pakke oversvømmelse test', icon: '📡', color: '#f97316' },
    { name: 'HTTP GET', description: 'HTTP GET anmodning test', icon: '🌐', color: '#22c55e' },
    { name: 'HTTP POST', description: 'HTTP POST anmodning test', icon: '📝', color: '#3b82f6' },
    { name: 'SYN Flood', description: 'SYN pakke oversvømmelse test', icon: '⚡', color: '#8b5cf6' },
    { name: 'ICMP Ping', description: 'ICMP ping test', icon: '🔔', color: '#ec4899' },
    { name: 'Bandwidth Test', description: 'Båndbredde belastningstest', icon: '📊', color: '#14b8a6' }
  ];

  db.get('SELECT COUNT(*) as count FROM test_methods', [], (err, row) => {
    if (row && row.count === 0) {
      testMethods.forEach(method => {
        db.run(`
          INSERT INTO test_methods (name, description, icon, color)
          VALUES (?, ?, ?, ?)
        `, [method.name, method.description, method.icon, method.color]);
      });
      console.log('Test methods seeded');
    }
  });

  // Seed sample API endpoints
  db.get('SELECT COUNT(*) as count FROM api_endpoints', [], (err, row) => {
    if (row && row.count === 0) {
      db.all('SELECT id FROM test_methods', [], (err, methods) => {
        methods.forEach((method, index) => {
          db.run(`
            INSERT INTO api_endpoints (method_id, api_url, username, api_key, priority)
            VALUES (?, ?, ?, ?, ?)
          `, [method.id, `https://api.example${index + 1}.com/test`, `user_${index + 1}`, `key_${Date.now()}`, 1]);
        });
        console.log('API endpoints seeded');
      });
    }
  });
}

module.exports = db;