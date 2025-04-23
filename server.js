const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const app = express();
const PORT = 5000;

// ===================
// Blockchain Setup
// ===================
class Block {
  constructor(timestamp, emailData, previousHash = '') {
    this.timestamp = timestamp;
    this.emailData = emailData;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
    this.nonce = 0;
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(
        this.timestamp +
        JSON.stringify(this.emailData) +
        this.previousHash +
        this.nonce
      )
      .digest('hex');
  }

  mineBlock(difficulty) {
    console.log("⛏️ Starting mining process...");
    let attempts = 0;
    const startTime = Date.now();
    
    while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
      this.nonce++;
      this.hash = this.calculateHash();
      attempts++;
      
      if (attempts % 10000 === 0) {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(
          `Mining: Attempt ${attempts} | Current hash: ${this.hash.substring(0, 15)}...`
        );
      }
    }
    
    const miningTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Block mined in ${miningTime}s after ${attempts} attempts`);
    console.log(`🔗 Final hash: ${this.hash}`);
  }
}

class EmailBlockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.pendingEmails = [];
    this.difficulty = 2;
  }

  createGenesisBlock() {
    return new Block(
      Date.now(),
      { to: "genesis@example.com", subject: "Genesis Block", text: "Initial block in the chain" },
      "0"
    );
  }

  addEmailToPending(emailData) {
    this.pendingEmails.push(emailData);
    console.log(`📨 Email added to pending block: ${emailData.subject}`);
  }

  minePendingEmails() {
    if (this.pendingEmails.length === 0) return;

    const block = new Block(
      Date.now(),
      this.pendingEmails,
      this.getLatestBlock().hash
    );
    
    block.mineBlock(this.difficulty);
    this.chain.push(block);
    this.pendingEmails = [];
    console.log(`⛏️ Mined block with ${block.emailData.length} emails`);
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (current.hash !== current.calculateHash()) return false;
      if (current.previousHash !== previous.hash) return false;
    }
    return true;
  }
}

const emailChain = new EmailBlockchain();

// ===================
// Email Configuration
// ===================
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'mekhi.bashirian@ethereal.email',
    pass: 'ghXA8QmXzxeMkG5Qzs'
  }
});

// ===================
// Middleware
// ===================
app.use(express.static('public'));
app.use(express.json());

// ===================
// API Endpoints
// ===================
app.post('/send-email', (req, res) => {
  const { to, subject, text } = req.body;

  // Add to blockchain
  emailChain.addEmailToPending({ to, subject, text });
  emailChain.minePendingEmails();

  // Send actual email
  const mailOptions = {
    from: '"SecureMail" <mekhi.bashirian@ethereal.email>',
    to,
    subject: `[Secured] ${subject}`,
    text: `${text}\n\n---\nThis email is recorded on our blockchain. Block hash: ${emailChain.getLatestBlock().hash}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("❌ Email failed:", error);
      return res.status(500).json({
        success: false,
        error: "Email delivery failed",
        blockchainStatus: "Email recorded in pending block"
      });
    }
    
    res.json({
      success: true,
      message: "Email sent and recorded on blockchain",
      block: emailChain.getLatestBlock(),
      previewUrl: nodemailer.getTestMessageUrl(info)
    });
  });
});

app.get('/blockchain', (req, res) => {
  res.json({
    chain: emailChain.chain,
    pendingEmails: emailChain.pendingEmails,
    isValid: emailChain.isChainValid(),
    length: emailChain.chain.length
  });
});

app.get('/block/:index', (req, res) => {
  const block = emailChain.chain[req.params.index];
  if (!block) return res.status(404).send('Block not found');
  
  res.json({
    index: req.params.index,
    ...block
  });
});

// ===================
// Server Startup
// ===================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔗 Blockchain ready with genesis block`);
  console.log(`✉️  Email endpoint: POST /send-email`);
  console.log(`⛓️  Blockchain explorer: GET /blockchain`);
});

// Mine pending emails every 5 minutes
setInterval(() => {
  if (emailChain.pendingEmails.length > 0) {
    console.log("⏰ Mining pending emails...");
    emailChain.minePendingEmails();
  }
}, 300000);