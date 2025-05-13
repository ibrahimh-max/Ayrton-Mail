// User Management
const getUsers = () => JSON.parse(localStorage.getItem('users')) || {};
const saveUser = (email, password) => {
  const users = getUsers();
  users[email] = password;
  localStorage.setItem('users', JSON.stringify(users));
};

// Authentication
function showSignup() {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  loginForm.style.display = 'none';
  signupForm.style.display = 'block';
  signupForm.classList.remove('hidden');
  signupForm.style.opacity = '1';
}

function showLogin() {
  const signupForm = document.getElementById('signupForm');
  const loginForm = document.getElementById('loginForm');
  signupForm.style.display = 'none';
  loginForm.style.display = 'block';
  loginForm.classList.remove('hidden');
  loginForm.style.opacity = '1';
}

function signup() {
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const error = document.getElementById('signupError');
  
  if (!email || !password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    error.style.display = 'block';
    error.classList.remove('hidden');
    return;
  }
  
  if (getUsers()[email]) {
    error.textContent = 'Email already exists';
    error.style.display = 'block';
    error.classList.remove('hidden');
    return;
  }
  
  saveUser(email, password);
  error.style.display = 'none';
  error.classList.add('hidden');
  alert('Signup successful! Please log in.');
  showLogin();
}

function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const error = document.getElementById('loginError');
  
  if (getUsers()[email] === password) {
    localStorage.setItem('loggedIn', email);
    showDashboard();
  } else {
    error.style.display = 'block';
    error.classList.remove('hidden');
  }
}

function logout() {
  localStorage.removeItem('loggedIn');
  document.getElementById('dashboardContainer').style.display = 'none';
  document.getElementById('authContainer').style.display = 'block';
  document.getElementById('navBar').style.display = 'none';
  showLogin();
}

// Dashboard
function showDashboard() {
  const authContainer = document.getElementById('authContainer');
  const dashboardContainer = document.getElementById('dashboardContainer');
  const navBar = document.getElementById('navBar');
  const emailForm = document.getElementById('emailForm');
  const showEmailBtn = document.getElementById('showEmailBtn');
  
  authContainer.style.display = 'none';
  dashboardContainer.style.display = 'block';
  dashboardContainer.classList.remove('hidden');
  dashboardContainer.style.opacity = '1';
  navBar.style.display = 'block';
  emailForm.style.display = 'none';
  emailForm.classList.add('hidden');
  showEmailBtn.style.display = 'block'; // Ensure "Send Email" button is visible on dashboard
  
  updateBlockchainStats();
  setInterval(updateBlockchainStats, 2000);
}

function showEmailForm() {
  const emailForm = document.getElementById('emailForm');
  const dashboard = document.querySelector('.dashboard');
  const showEmailBtn = document.getElementById('showEmailBtn');
  
  emailForm.style.display = 'block';
  emailForm.classList.remove('hidden');
  emailForm.style.opacity = '1';
  dashboard.style.display = 'none';
  dashboard.classList.add('hidden');
  showEmailBtn.style.display = 'none'; // Hide "Send Email" button when form is open
  
  resetVoiceRecording();
}

function backToDashboard() {
  const emailForm = document.getElementById('emailForm');
  const dashboard = document.querySelector('.dashboard');
  const showEmailBtn = document.getElementById('showEmailBtn');
  
  emailForm.style.display = 'none';
  emailForm.classList.add('hidden');
  dashboard.style.display = 'block';
  dashboard.classList.remove('hidden');
  dashboard.style.opacity = '1';
  showEmailBtn.style.display = 'block'; // Show "Send Email" button when returning
  updateBlockchainStats();
}

// Blockchain
function updateBlockchainStats() {
  fetch('http://localhost:5000/blockchain')
    .then(handleResponse)
    .then(data => {
      document.getElementById('chain-length').textContent = data.chain.length;
      document.getElementById('pending-emails').textContent = data.pendingEmails.length;
      const statusEl = document.getElementById('chain-status');
      statusEl.textContent = data.isValid ? '✓' : '✗';
      statusEl.className = data.isValid ? 'valid' : 'invalid';
    })
    .catch(err => console.error('Blockchain error:', err));
}

function viewChain() {
  fetch('http://localhost:5000/blockchain')
    .then(handleResponse)
    .then(({ chain, isValid }) => {
      const viewer = document.createElement('div');
      viewer.className = 'blockchain-viewer';
      viewer.innerHTML = `
        <h2 style="color: ${isValid ? '#39FF14' : '#39FF14'}">
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
                  ${block.emailData.voiceClip ? 
                    '<button onclick="playVoiceFromBlock(' + index + ')">▶️ Play Voice</button>' : 
                    '<p>' + (block.emailData.text || "[Voice Message]") + '</p>'}
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
      document.getElementById('chain-display').innerHTML = '';
      document.getElementById('chain-display').appendChild(viewer);
    })
    .catch(err => alert("Failed to load blockchain: " + err.message));
}

function playVoiceFromBlock(blockIndex) {
  fetch(`http://localhost:5000/block/${blockIndex}`)
    .then(handleResponse)
    .then(block => {
      if (block.emailData.voiceClip) {
        const audio = new Audio(`data:audio/wav;base64,${block.emailData.voiceClip}`);
        audio.play();
      } else {
        alert("No voice message in this block");
      }
    })
    .catch(err => alert("Error loading block: " + err.message));
}

// Voice Recording
let mediaRecorder;
let audioChunks = [];

function resetVoiceRecording() {
  audioChunks = [];
  const playback = document.getElementById('voicePlayback');
  if (playback) {
    playback.src = '';
    playback.style.display = 'none';
  }
}

function blobToBase64(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

document.getElementById('startRecording').addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const playback = document.getElementById('voicePlayback');
      playback.src = audioUrl;
      playback.style.display = 'block';
    };
    
    mediaRecorder.start();
    document.getElementById('startRecording').disabled = true;
    document.getElementById('stopRecording').disabled = false;
  } catch (err) {
    alert("Microphone access denied. Please type your message.");
  }
});

document.getElementById('stopRecording').addEventListener('click', () => {
  if (mediaRecorder?.state !== 'inactive') {
    mediaRecorder?.stop();
    document.getElementById('startRecording').disabled = false;
    document.getElementById('stopRecording').disabled = true;
    mediaRecorder?.stream?.getTracks()?.forEach(track => track.stop());
  }
});

// Email Sending
async function sendEmail() {
  const recipient = document.getElementById('recipient').value;
  const subject = document.getElementById('subject').value;
  const message = document.getElementById('message').value;
  const error = document.getElementById('emailError');

  if (!recipient || !subject || (!message && audioChunks.length === 0)) {
    error.textContent = "Please provide either text or voice message";
    error.style.display = 'block';
    error.classList.remove('hidden');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    error.textContent = "Invalid recipient email";
    error.style.display = 'block';
    error.classList.remove('hidden');
    return;
  }

  error.style.display = 'none';
  error.classList.add('hidden');

  try {
    const requestData = {
      to: recipient,
      subject: subject,
      text: message || "[Voice Message]"
    };

    if (audioChunks.length > 0) {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      requestData.voiceClip = await blobToBase64(audioBlob);
    }

    const sendBtn = document.querySelector('#emailForm button[onclick="sendEmail()"]');
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";

    const response = await fetch('http://localhost:5000/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    const result = await handleResponse(response);

    alert(result.message || "Email sent successfully!");
    document.getElementById('message').value = '';
    resetVoiceRecording();
    backToDashboard();
  } catch (err) {
    error.textContent = err.message;
    error.style.display = 'block';
    error.classList.remove('hidden');
  } finally {
    const sendBtn = document.querySelector('#emailForm button[onclick="sendEmail()"]');
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send Email";
    }
  }
}

// Helper Functions
function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error("Invalid server response");
  }
  if (!response.ok) {
    return response.json().then(err => { throw new Error(err.error || "Request failed") });
  }
  return response.json();
}

// Initialize App
window.onload = function() {
  if (localStorage.getItem('loggedIn')) {
    showDashboard();
  }
  
  document.querySelectorAll('.toggle span').forEach(element => {
    element.addEventListener('click', function() {
      if (this.textContent === 'Sign up') showSignup();
      if (this.textContent === 'Log in') showLogin();
    });
  });

  document.querySelector('form')?.addEventListener('submit', e => e.preventDefault());
};
