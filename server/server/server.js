const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const auth = require('./auth');
const testMethods = require('./testMethods');
const apiEndpoints = require('./apiEndpoints');
const networkTest = require('./networkTest');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ============ AUTH ROUTES ============
app.post('/api/auth/login', auth.login);
app.post('/api/auth/register', auth.register);
app.get('/api/auth/me', auth.authenticateToken, auth.getCurrentUser);
app.put('/api/auth/password', auth.authenticateToken, auth.changePassword);

// ============ USER MANAGEMENT (Admin) ============
app.get('/api/users', auth.authenticateToken, auth.requireAdmin, (req, res) => {
  const query = `
    SELECT id, username, email, role, plan_type, credits_used, credit_limit, 
           plan_expires_at, is_blocked, created_at, last_login
    FROM users
    ORDER BY id
  `;
  db.all(query, [], (err, users) => {
    if (err) return res.status(500).json({ error: 'Database fejl.' });
    res.json(users);
  });
});

app.post('/api/users', auth.authenticateToken, auth.requireAdmin, (req, res) => {
  const { username, email, password, role, plan_type, credit_limit, plan_expires_at } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Brugernavn og adgangskode er påkrævet.' });
  }

  const hashedPassword = auth.hashPassword(password);

  db.run(
    `INSERT INTO users (username, email, password, role, plan_type, credit_limit, plan_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [username, email || null, hashedPassword, role || 'user', plan_type || 'none', credit_limit || 100, plan_expires_at || null],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Brugernavnet er allerede i brug.' });
        }
        return res.status(500).json({ error: 'Fejl ved oprettelse af bruger.' });
      }
      db.get('SELECT id, username, email, role, plan_type, credits_used, credit_limit, plan_expires_at, is_blocked, created_at FROM users WHERE id = ?', [this.lastID], (err, user) => {
        if (err) return res.status(500).json({ error: 'Fejl ved hentning af bruger.' });
        res.status(201).json(user);
      });
    }
  );
});

app.put('/api/users/:id', auth.authenticateToken, auth.requireAdmin, (req, res) => {
  const { id } = req.params;
  const { role, plan_type, credit_limit, plan_expires_at, is_blocked } = req.body;

  db.run(
    `UPDATE users SET role = COALESCE(?, role), plan_type = COALESCE(?, plan_type),
     credit_limit = COALESCE(?, credit_limit), plan_expires_at = COALESCE(?, plan_expires_at),
     is_blocked = COALESCE(?, is_blocked)
     WHERE id = ?`,
    [role, plan_type, credit_limit, plan_expires_at, is_blocked !== undefined ? (is_blocked ? 1 : 0) : null, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Fejl ved opdatering af bruger.' });
      if (this.changes === 0) return res.status(404).json({ error: 'Bruger ikke fundet.' });
      db.get('SELECT id, username, email, role, plan_type, credits_used, credit_limit, plan_expires_at, is_blocked, created_at FROM users WHERE id = ?', [id], (err, user) => {
        if (err) return res.status(500).json({ error: 'Fejl ved hentning af bruger.' });
        res.json(user);
      });
    }
  );
});

app.delete('/api/users/:id', auth.authenticateToken, auth.requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Fejl ved sletning af bruger.' });
    if (this.changes === 0) return res.status(404).json({ error: 'Bruger ikke fundet.' });
    res.json({ message: 'Bruger slettet succesfuldt!' });
  });
});

// ============ TEST METHODS ROUTES ============
app.get('/api/methods', testMethods.getAllMethods);
app.get('/api/methods/active', testMethods.getActiveMethods);
app.get('/api/methods/stats', auth.authenticateToken, auth.requireAdmin, testMethods.getMethodsWithStats);
app.get('/api/methods/:id', testMethods.getMethod);
app.post('/api/methods', auth.authenticateToken, auth.requireAdmin, testMethods.createMethod);
app.put('/api/methods/:id', auth.authenticateToken, auth.requireAdmin, testMethods.updateMethod);
app.delete('/api/methods/:id', auth.authenticateToken, auth.requireAdmin, testMethods.deleteMethod);

// ============ API ENDPOINTS ROUTES ============
app.get('/api/endpoints', auth.authenticateToken, auth.requireAdmin, apiEndpoints.getAllEndpoints);
app.get('/api/endpoints/method/:methodId', auth.authenticateToken, apiEndpoints.getEndpointsByMethod);
app.get('/api/endpoints/:id', auth.authenticateToken, auth.requireAdmin, apiEndpoints.getEndpoint);
app.post('/api/endpoints', auth.authenticateToken, auth.requireAdmin, apiEndpoints.createEndpoint);
app.put('/api/endpoints/:id', auth.authenticateToken, auth.requireAdmin, apiEndpoints.updateEndpoint);
app.delete('/api/endpoints/:id', auth.authenticateToken, auth.requireAdmin, apiEndpoints.deleteEndpoint);

// ============ NETWORK TEST ROUTES ============
app.post('/api/test', auth.authenticateToken, networkTest.startTest);
app.get('/api/test/history', auth.authenticateToken, networkTest.getTestHistory);
app.get('/api/test/results', auth.authenticateToken, auth.requireAdmin, networkTest.getAllTestResults);
app.get('/api/statistics', networkTest.getStatistics);

// ============ SERVE FRONTEND ============
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Noget gik galt på serveren.' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`http://0.0.0.0:${PORT}`);
});

module.exports = app;