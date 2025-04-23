// User Database Functions
function getUsers() {
  return JSON.parse(localStorage.getItem('users')) || {};
}

function saveUser(email, password) {
  const users = getUsers();
  users[email] = password;
  localStorage.setItem('users', JSON.stringify(users));
}

// Form Visibility Functions
function showSignup() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('signupForm').style.display = 'block';
}

function showLogin() {
  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
}

// Authentication Functions
function signup() {
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const error = document.getElementById('signupError');
  
  if (!email || !password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error.style.display = 'block';
      return;
  }
  
  const users = getUsers();
  if (users[email]) {
      error.textContent = 'Email already exists';
      error.style.display = 'block';
      return;
  }
  
  saveUser(email, password);
  error.style.display = 'none';
  alert('Signup successful! Please log in.');
  showLogin();
}

function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const error = document.getElementById('loginError');
  const users = getUsers();
  
  if (users[email] && users[email] === password) {
      localStorage.setItem('loggedIn', email);
      showDashboard();
  } else {
      error.style.display = 'block';
  }
}

function logout() {
  localStorage.removeItem('loggedIn');
  document.getElementById('dashboardContainer').style.display = 'none';
  document.getElementById('authContainer').style.display = 'block';
  document.getElementById('navBar').style.display = 'none';
  showLogin();
}

// Dashboard Functions
function showDashboard() {
  document.getElementById('authContainer').style.display = 'none';
  document.getElementById('dashboardContainer').style.display = 'block';
  document.getElementById('navBar').style.display = 'block';
  document.getElementById('emailForm').style.display = 'none';
  
  // Initialize blockchain components
  updateBlockchainStats();
  // Update stats every 2 seconds
  setInterval(updateBlockchainStats, 2000);
}

function showEmailForm() {
  document.getElementById('emailForm').style.display = 'block';
  document.querySelector('.dashboard').style.display = 'none';
}

function backToDashboard() {
  document.getElementById('emailForm').style.display = 'none';
  document.querySelector('.dashboard').style.display = 'block';
  updateBlockchainStats(); // Refresh stats when returning to dashboard
}

// Blockchain Functions
function updateBlockchainStats() {
  fetch('http://localhost:5000/blockchain')
      .then(response => response.json())
      .then(data => {
          document.getElementById('chain-length').textContent = data.chain.length;
          document.getElementById('pending-emails').textContent = data.pendingEmails.length;
          
          const statusEl = document.getElementById('chain-status');
          statusEl.textContent = data.isValid ? '✓' : '✗';
          statusEl.className = data.isValid ? 'valid' : 'invalid';
      })
      .catch(error => {
          console.error('Error fetching blockchain data:', error);
      });
}

async function viewChain() {
  try {
    const response = await fetch('http://localhost:5000/blockchain');
    const { chain, isValid } = await response.json();
    
    const viewer = document.createElement('div');
    viewer.className = 'blockchain-viewer';
    
    viewer.innerHTML = `
      <h2 style="color: ${isValid ? '#4CAF50' : '#F44336'}">
        ${isValid ? '✓ Valid Blockchain' : '✗ Corrupted Chain'}
      </h2>
      <div class="blocks-grid">
        ${chain.map((block, index) => `
          <div class="block-card ${index === 0 ? 'genesis' : ''}">
            <div class="block-header">
              <span class="block-number">Block #${index}</span>
              <span class="block-badge">${index === 0 ? 'Genesis' : 'Email'}</span>
            </div>
            <div class="block-body">
              ${index > 0 ? `
                <p><strong>To:</strong> ${block.emailData.to}</p>
                <p><strong>Subject:</strong> ${block.emailData.subject}</p>
                <p class="timestamp">⏱️ ${new Date(block.timestamp).toLocaleString()}</p>
              ` : '<p>Initial Block</p>'}
            </div>
            <div class="block-footer">
              <p class="hash" title="${block.hash}">
                🔗 ${block.hash.substring(0, 12)}...
              </p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    document.body.appendChild(viewer);
  } catch (err) {
    alert("Failed to load blockchain. Is the server running?");
  }
}

// Email Functions
function sendEmail() {
  const recipient = document.getElementById('recipient').value;
  const subject = document.getElementById('subject').value;
  const message = document.getElementById('message').value;
  const error = document.getElementById('emailError');
  
  if (!recipient || !subject || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      error.style.display = 'block';
      return;
  }
  
  error.style.display = 'none';
  
  fetch('http://localhost:5000/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          to: recipient,
          subject: subject,
          text: message
      })
  })
  .then(response => response.json())
  .then(data => {
      alert(data.message);
      backToDashboard();
  })
  .catch(error => {
      console.error('Error:', error);
      alert('Failed to send email');
  });
}

// Initialize App
window.onload = function() {
  if (localStorage.getItem('loggedIn')) {
      showDashboard();
  }
  
  // Add click handlers for form toggles
  document.querySelectorAll('.toggle span').forEach(element => {
      element.addEventListener('click', function() {
          if (this.textContent === 'Sign up') showSignup();
          if (this.textContent === 'Log in') showLogin();
      });
  });
};