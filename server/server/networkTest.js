const db = require('./database');

// Active tests storage (in-memory for demo)
const activeTests = new Map();

// Validate target address (IP or domain)
function isValidTarget(target) {
  // IPv4 regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // Domain regex
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
  
  if (ipv4Regex.test(target)) {
    const parts = target.split('.');
    return parts.every(part => parseInt(part) <= 255);
  }
  return domainRegex.test(target);
}

// Validate port
function isValidPort(port) {
  const portNum = parseInt(port);
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}

// Validate duration
function isValidDuration(duration) {
  const dur = parseInt(duration);
  return !isNaN(dur) && dur >= 1 && dur <= 3600;
}

// Simulate network test (for demo purposes)
async function simulateTest(target, port, duration, method) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90% success rate
      resolve({
        success,
        target,
        port,
        duration,
        method,
        packets_sent: Math.floor(Math.random() * 10000) + 1000,
        packets_received: Math.floor(Math.random() * 9000) + 900,
        avg_latency: (Math.random() * 100 + 10).toFixed(2) + 'ms',
        timestamp: new Date().toISOString()
      });
    }, Math.min(duration * 100, 5000)); // Cap at 5 seconds for demo
  });
}

// Start network test
async function startTest(req, res) {
  const { target_address, port, duration, method_id } = req.body;
  const userId = req.user.id;

  // Validate inputs
  if (!target_address || !isValidTarget(target_address)) {
    return res.status(400).json({ error: 'Ugyldig mål adresse. Brug IP eller domæne.' });
  }

  if (!port || !isValidPort(port)) {
    return res.status(400).json({ error: 'Port skal være mellem 1 og 65535.' });
  }

  if (!duration || !isValidDuration(duration)) {
    return res.status(400).json({ error: 'Varighed skal være mellem 1 og 3600 sekunder.' });
  }

  if (!method_id) {
    return res.status(400).json({ error: 'Test metode er påkrævet.' });
  }

  // Check user credits
  db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database fejl.' });
    }

    if (!user) {
      return res.status(404).json({ error: 'Bruger ikke fundet.' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Din konto er blokeret.' });
    }

    // Check credit limit (0 = unlimited)
    if (user.credit_limit > 0 && user.credits_used >= user.credit_limit) {
      return res.status(403).json({ error: 'Du har brugt alle dine credits.' });
    }

    // Check plan expiration
    if (user.plan_expires_at && new Date(user.plan_expires_at) < new Date()) {
      return res.status(403).json({ error: 'Din plan er udløbet.' });
    }

    // Get method details
    db.get('SELECT * FROM test_methods WHERE id = ? AND is_active = 1', [method_id], async (err, method) => {
      if (err) {
        return res.status(500).json({ error: 'Database fejl.' });
      }

      if (!method) {
        return res.status(404).json({ error: 'Test metode ikke fundet eller inaktiv.' });
      }

      // Create test result entry
      db.run(
        'INSERT INTO test_results (user_id, method_id, target_address, port, duration, status) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, method_id, target_address, port, duration, 'running'],
        async function (err) {
          if (err) {
            return res.status(500).json({ error: 'Fejl ved oprettelse af test.' });
          }

          const testId = this.lastID;

          // Start test simulation
          try {
            const result = await simulateTest(target_address, port, duration, method.name);

            // Update test result
            db.run(
              'UPDATE test_results SET status = ?, result_data = ? WHERE id = ?',
              [result.success ? 'completed' : 'failed', JSON.stringify(result), testId]
            );

            // Update user credits
            db.run(
              'UPDATE users SET credits_used = credits_used + 1 WHERE id = ?',
              [userId]
            );

            res.json({
              test_id: testId,
              message: 'Test gennemført!',
              result
            });
          } catch (error) {
            db.run('UPDATE test_results SET status = ? WHERE id = ?', ['error', testId]);
            res.status(500).json({ error: 'Fejl under test udførelse.' });
          }
        }
      );
    });
  });
}

// Get test history
function getTestHistory(req, res) {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  const query = `
    SELECT tr.*, tm.name as method_name, tm.icon, tm.color
    FROM test_results tr
    LEFT JOIN test_methods tm ON tr.method_id = tm.id
    WHERE tr.user_id = ?
    ORDER BY tr.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [userId, limit, offset], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database fejl.' });
    }
    res.json(results);
  });
}

// Get all test results (admin only)
function getAllTestResults(req, res) {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  const query = `
    SELECT tr.*, tm.name as method_name, u.username
    FROM test_results tr
    LEFT JOIN test_methods tm ON tr.method_id = tm.id
    LEFT JOIN users u ON tr.user_id = u.id
    ORDER BY tr.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [limit, offset], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database fejl.' });
    }
    res.json(results);
  });
}

// Get statistics
function getStatistics(req, res) {
  const queries = {
    totalTests: 'SELECT COUNT(*) as count FROM test_results',
    totalUsers: 'SELECT COUNT(*) as count FROM users',
    activeUsers: 'SELECT COUNT(*) as count FROM users WHERE is_blocked = 0',
    testsToday: "SELECT COUNT(*) as count FROM test_results WHERE date(created_at) = date('now')"
  };

  const stats = {};
  let completed = 0;

  Object.entries(queries).forEach(([key, query]) => {
    db.get(query, [], (err, result) => {
      if (!err) {
        stats[key] = result.count;
      }
      completed++;
      if (completed === Object.keys(queries).length) {
        res.json(stats);
      }
    });
  });
}

module.exports = {
  startTest,
  getTestHistory,
  getAllTestResults,
  getStatistics
};