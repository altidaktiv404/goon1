// ========================================
// NETWORK TEST PANEL - MAIN JAVASCRIPT
// ========================================

const API_URL = '/api';
let currentUser = null;
let token = localStorage.getItem('token');

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  // Check if user is logged in
  if (token) {
    verifyTokenAndLoadUser();
  } else {
    showLandingPage();
  }
  
  // Setup event listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Modal triggers
  document.getElementById('loginBtn')?.addEventListener('click', () => openModal('loginModal'));
  document.getElementById('registerBtn')?.addEventListener('click', () => openModal('registerModal'));
  
  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      closeModal(modal.id);
    });
  });
  
  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });
  
  // Login form
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  
  // Register form
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
  
  // Logout button
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  
  // Test form
  document.getElementById('testForm')?.addEventListener('submit', handleTestSubmit);
  
  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
  });
  
  // Change password form
  document.getElementById('changePasswordForm')?.addEventListener('submit', handleChangePassword);
}

// ========================================
// AUTH FUNCTIONS
// ========================================

async function verifyTokenAndLoadUser() {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      currentUser = await response.json();
      showDashboard();
    } else {
      localStorage.removeItem('token');
      token = null;
      showLandingPage();
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    showLandingPage();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      token = data.token;
      currentUser = data.user;
      localStorage.setItem('token', token);
      closeModal('loginModal');
      showToast('Login succesfuldt!', 'success');
      showDashboard();
    } else {
      errorEl.textContent = data.error || 'Login fejlede';
      errorEl.classList.remove('hidden');
    }
  } catch (error) {
    errorEl.textContent = 'Forbindelsesfejl. Prøv igen.';
    errorEl.classList.remove('hidden');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const username = document.getElementById('registerUsername').value;
  const password = document.getElementById('registerPassword').value;
  const email = document.getElementById('registerEmail').value;
  const errorEl = document.getElementById('registerError');
  
  errorEl.textContent = '';
  errorEl.classList.add('hidden');
  
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email: email || null })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      token = data.token;
      currentUser = data.user;
      localStorage.setItem('token', token);
      closeModal('registerModal');
      showToast('Konto oprettet!', 'success');
      showDashboard();
    } else {
      errorEl.textContent = data.error || 'Registrering fejlede';
      errorEl.classList.remove('hidden');
    }
  } catch (error) {
    errorEl.textContent = 'Forbindelsesfejl. Prøv igen.';
    errorEl.classList.remove('hidden');
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  token = null;
  currentUser = null;
  showToast('Du er logget ud', 'info');
  showLandingPage();
}

async function handleChangePassword(e) {
  e.preventDefault();
  
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  
  try {
    const response = await fetch(`${API_URL}/auth/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Adgangskode ændret!', 'success');
      document.getElementById('changePasswordForm').reset();
    } else {
      showToast(data.error || 'Fejl ved ændring af adgangskode', 'error');
    }
  } catch (error) {
    showToast('Forbindelsesfejl', 'error');
  }
}

// ========================================
// UI FUNCTIONS
// ========================================

function showLandingPage() {
  document.getElementById('landingPage')?.classList.remove('hidden');
  document.getElementById('dashboard')?.classList.remove('active');
  document.getElementById('navbarGuest')?.classList.remove('hidden');
  document.getElementById('navbarUser')?.classList.add('hidden');
}

function showDashboard() {
  document.getElementById('landingPage')?.classList.add('hidden');
  document.getElementById('dashboard')?.classList.add('active');
  document.getElementById('navbarGuest')?.classList.add('hidden');
  document.getElementById('navbarUser')?.classList.remove('hidden');
  
  // Update user info
  document.getElementById('userName').textContent = currentUser.username;
  
  // Update role badge
  const roleBadge = document.getElementById('roleBadge');
  if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
    roleBadge.textContent = currentUser.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN';
    roleBadge.className = 'user-badge badge-admin';
  } else {
    roleBadge.textContent = 'BRUGER';
    roleBadge.className = 'user-badge badge-user';
  }
  
  // Show admin tab if admin
  if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
    document.getElementById('adminTabBtn')?.classList.remove('hidden');
    loadUsers();
    loadMethods();
    loadEndpoints();
  } else {
    document.getElementById('adminTabBtn')?.classList.add('hidden');
  }
  
  // Load data
  loadDashboardData();
  loadTestMethods();
}

function openModal(modalId) {
  document.getElementById(modalId)?.classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove('active');
}

function switchTab(tabId) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabId) btn.classList.add('active');
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(tabId)?.classList.add('active');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========================================
// DASHBOARD DATA
// ========================================

async function loadDashboardData() {
  try {
    // Update stats
    document.getElementById('totalTests').textContent = currentUser.credits_used || 0;
    document.getElementById('usedCredits').textContent = currentUser.credits_used || 0;
    
    // Plan type
    const planType = currentUser.plan_type || 'none';
    const planNames = { none: 'Ingen Plan', normal: 'Normal', vip: 'VIP' };
    document.getElementById('planType').textContent = planNames[planType] || 'Ingen Plan';
    
    // Credit limit progress
    if (currentUser.credit_limit > 0) {
      const percentage = Math.min((currentUser.credits_used / currentUser.credit_limit) * 100, 100);
      document.getElementById('creditProgress').style.width = `${percentage}%`;
      document.getElementById('creditText').textContent = `${currentUser.credits_used} / ${currentUser.credit_limit}`;
    } else {
      document.getElementById('creditProgress').style.width = '0%';
      document.getElementById('creditText').textContent = 'Ubegrænset';
    }
    
    // Days remaining
    if (currentUser.plan_expires_at) {
      const expiry = new Date(currentUser.plan_expires_at);
      const now = new Date();
      const days = Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
      document.getElementById('daysRemaining').textContent = days;
    } else {
      document.getElementById('daysRemaining').textContent = '-';
    }
    
    // Load test history
    loadTestHistory();
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

async function loadTestMethods() {
  try {
    const response = await fetch(`${API_URL}/methods/active`);
    const methods = await response.json();
    
    const select = document.getElementById('testMethod');
    if (!select) return;
    
    select.innerHTML = '<option value="">Vælg test metode</option>';
    methods.forEach(method => {
      select.innerHTML += `<option value="${method.id}">${method.icon} ${method.name}</option>`;
    });
  } catch (error) {
    console.error('Error loading test methods:', error);
  }
}

async function loadTestHistory() {
  try {
    const response = await fetch(`${API_URL}/test/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const results = await response.json();
    
    const container = document.getElementById('testHistoryTable');
    if (!container) return;
    
    if (results.length === 0) {
      container.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">Ingen tests endnu</td></tr>';
      return;
    }
    
    container.innerHTML = results.map(r => `
      <tr>
        <td>${r.icon || '🔧'} ${r.method_name || 'Ukendt'}</td>
        <td>${r.target_address}</td>
        <td>${r.port}</td>
        <td>${r.duration}s</td>
        <td><span class="badge ${r.status === 'completed' ? 'badge-success' : r.status === 'running' ? 'badge-info' : 'badge-error'}">${r.status}</span></td>
        <td>${new Date(r.created_at).toLocaleString('da-DK')}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading test history:', error);
  }
}

// ========================================
// TEST EXECUTION
// ========================================

async function handleTestSubmit(e) {
  e.preventDefault();
  
  const targetAddress = document.getElementById('targetAddress').value;
  const port = document.getElementById('port').value;
  const duration = document.getElementById('duration').value;
  const methodId = document.getElementById('testMethod').value;
  
  const submitBtn = document.getElementById('submitTest');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading"></span> Kører test...';
  
  try {
    const response = await fetch(`${API_URL}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        target_address: targetAddress,
        port: parseInt(port),
        duration: parseInt(duration),
        method_id: parseInt(methodId)
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Test gennemført!', 'success');
      showTestResult(data.result);
      loadDashboardData();
    } else {
      showToast(data.error || 'Test fejlede', 'error');
    }
  } catch (error) {
    showToast('Forbindelsesfejl', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '🚀 Send Test';
  }
}

function showTestResult(result) {
  const resultEl = document.getElementById('testResult');
  if (!resultEl) return;
  
  document.getElementById('resultTarget').textContent = result.target;
  document.getElementById('resultPort').textContent = result.port;
  document.getElementById('resultDuration').textContent = result.duration + 's';
  document.getElementById('resultPackets').textContent = result.packets_sent;
  document.getElementById('resultLatency').textContent = result.avg_latency;
  
  resultEl.classList.add('active');
}

// ========================================
// ADMIN FUNCTIONS
// ========================================

async function loadUsers() {
  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await response.json();
    
    const container = document.getElementById('usersTableBody');
    if (!container) return;
    
    container.innerHTML = users.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.username}</td>
        <td>${u.email || '-'}</td>
        <td><span class="user-badge ${u.role === 'super_admin' ? 'badge-admin' : u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span></td>
        <td><span class="user-badge ${u.plan_type === 'vip' ? 'badge-vip' : ''}">${u.plan_type}</span></td>
        <td>${u.credits_used}/${u.credit_limit === 0 ? '∞' : u.credit_limit}</td>
        <td>${u.plan_expires_at ? new Date(u.plan_expires_at).toLocaleDateString('da-DK') : '-'}</td>
        <td>${u.is_blocked ? '🔴 Blokeret' : '🟢 Aktiv'}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="editUser(${u.id})">✏️</button>
            <button class="btn btn-sm ${u.is_blocked ? 'btn-success' : 'btn-danger'}" onclick="toggleBlockUser(${u.id}, ${u.is_blocked})">${u.is_blocked ? '🔓' : '🔒'}</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

async function loadMethods() {
  try {
    const response = await fetch(`${API_URL}/methods`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const methods = await response.json();
    
    const container = document.getElementById('methodsTableBody');
    if (!container) return;
    
    container.innerHTML = methods.map(m => `
      <tr>
        <td>${m.id}</td>
        <td><span style="font-size: 1.5rem;">${m.icon}</span> ${m.name}</td>
        <td>${m.description || '-'}</td>
        <td><span style="display: inline-block; width: 20px; height: 20px; background: ${m.color}; border-radius: 4px;"></span> ${m.color}</td>
        <td>${m.is_active ? '🟢 Aktiv' : '🔴 Inaktiv'}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="editMethod(${m.id})">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteMethod(${m.id})">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading methods:', error);
  }
}

async function loadEndpoints() {
  try {
    const response = await fetch(`${API_URL}/endpoints`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const endpoints = await response.json();
    
    const container = document.getElementById('endpointsTableBody');
    if (!container) return;
    
    container.innerHTML = endpoints.map(e => `
      <tr>
        <td>${e.id}</td>
        <td>${e.method_name || '-'}</td>
        <td>${e.api_url}</td>
        <td>${e.username || '-'}</td>
        <td><code>${e.api_key}</code></td>
        <td>${e.priority}</td>
        <td>${e.is_active ? '🟢 Aktiv' : '🔴 Inaktiv'}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="editEndpoint(${e.id})">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteEndpoint(${e.id})">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading endpoints:', error);
  }
}

// Create User
document.getElementById('createUserForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showToast('Bruger oprettet!', 'success');
      e.target.reset();
      loadUsers();
    } else {
      showToast(result.error || 'Fejl ved oprettelse', 'error');
    }
  } catch (error) {
    showToast('Forbindelsesfejl', 'error');
  }
});

// Create Method
document.getElementById('createMethodForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  data.is_active = formData.has('is_active');
  
  try {
    const response = await fetch(`${API_URL}/methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showToast('Metode oprettet!', 'success');
      e.target.reset();
      loadMethods();
    } else {
      showToast(result.error || 'Fejl ved oprettelse', 'error');
    }
  } catch (error) {
    showToast('Forbindelsesfejl', 'error');
  }
});

// Create Endpoint
document.getElementById('createEndpointForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  data.method_id = data.method_id || null;
  data.is_active = formData.has('is_active');
  
  try {
    const response = await fetch(`${API_URL}/endpoints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showToast('Endpoint oprettet!', 'success');
      e.target.reset();
      loadEndpoints();
    } else {
      showToast(result.error || 'Fejl ved oprettelse', 'error');
    }
  } catch (error) {
    showToast('Forbindelsesfejl', 'error');
  }
});

// Toggle Block User
async function toggleBlockUser(userId, isBlocked) {
  try {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ is_blocked: !isBlocked })
    });
    
    if (response.ok) {
      showToast(isBlocked ? 'Bruger ophevet blokering' : 'Bruger blokeret', 'success');
      loadUsers();
    }
  } catch (error) {
    showToast('Fejl ved opdatering', 'error');
  }
}

// Edit User
function editUser(userId) {
  showToast('Rediger bruger modal - kommer snart', 'info');
}

// Edit Method
function editMethod(methodId) {
  showToast('Rediger metode modal - kommer snart', 'info');
}

// Edit Endpoint
function editEndpoint(endpointId) {
  showToast('Rediger endpoint modal - kommer snart', 'info');
}

// Delete Method
async function deleteMethod(methodId) {
  if (!confirm('Er du sikker på, at du vil slette denne metode?')) return;
  
  try {
    const response = await fetch(`${API_URL}/methods/${methodId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      showToast('Metode slettet', 'success');
      loadMethods();
    }
  } catch (error) {
    showToast('Fejl ved sletning', 'error');
  }
}

// Delete Endpoint
async function deleteEndpoint(endpointId) {
  if (!confirm('Er du sikker på, at du vil slette dette endpoint?')) return;
  
  try {
    const response = await fetch(`${API_URL}/endpoints/${endpointId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      showToast('Endpoint slettet', 'success');
      loadEndpoints();
    }
  } catch (error) {
    showToast('Fejl ved sletning', 'error');
  }
}

// Make functions globally available
window.toggleBlockUser = toggleBlockUser;
window.editUser = editUser;
window.editMethod = editMethod;
window.editEndpoint = editEndpoint;
window.deleteMethod = deleteMethod;
window.deleteEndpoint = deleteEndpoint;