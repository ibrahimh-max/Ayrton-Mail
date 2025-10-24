const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const app = express();
const PORT = 5000;

// ===================
// SIMPLE Blockchain (No Complex Crypto)
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
    console.log("⛏️ Mining block...");
    let attempts = 0;
    
    while (this.hash.substring(0, difficulty) !== '0'.repeat(difficulty)) {
      this.nonce++;
      this.hash = this.calculateHash();
      attempts++;
      
      if (attempts % 1000 === 0) {
        process.stdout.write(`\rMining attempts: ${attempts}`);
      }
    }
    
    console.log(`\n✅ Block mined after ${attempts} attempts!`);
    return this.hash;
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
      { 
        to: "genesis@example.com", 
        subject: "Genesis Block", 
        message: "First block in chain" 
      },
      "0"
    );
  }

  addEmailToPending(emailData) {
    this.pendingEmails.push({
      ...emailData,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now()
    });
    console.log(`📨 Email added to pending: ${emailData.subject}`);
  }

  minePendingEmails() {
    if (this.pendingEmails.length === 0) return null;

    console.log(`⛏️ Mining ${this.pendingEmails.length} emails...`);
    const block = new Block(
      Date.now(),
      this.pendingEmails,
      this.getLatestBlock().hash
    );
    
    block.mineBlock(this.difficulty);
    this.chain.push(block);
    
    console.log(`✅ Block #${this.chain.length - 1} mined successfully!`);
    
    const minedBlock = {
      blockNumber: this.chain.length - 1,
      blockHash: block.hash,
      emails: this.pendingEmails
    };
    
    this.pendingEmails = [];
    return minedBlock;
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
// Email Setup
// ===================
const transporter = nodemailer.createTransporter({
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
app.use(express.json());
app.use(express.static('public'));

// ===================
// API Routes
// ===================
app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, text } = req.body;

    // Add to blockchain
    emailChain.addEmailToPending({ to, subject, text });
    
    // Mine the block
    const minedBlock = emailChain.minePendingEmails();

    // Send actual email
    const mailOptions = {
      from: '"Blockchain Mail" <mekhi.bashirian@ethereal.email>',
      to: to,
      subject: `[Blockchain] ${subject}`,
      text: `${text}\n\n---\nBlockchain Verified: Block #${minedBlock.blockNumber}\nHash: ${minedBlock.blockHash}`
    };

    const info = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      message: "Email sent and recorded on blockchain!",
      block: {
        number: minedBlock.blockNumber,
        hash: minedBlock.blockHash
      },
      preview: nodemailer.getTestMessageUrl(info)
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send email"
    });
  }
});

app.get('/blockchain', (req, res) => {
  res.json({
    chain: emailChain.chain,
    pendingEmails: emailChain.pendingEmails,
    isValid: emailChain.isChainValid(),
    totalBlocks: emailChain.chain.length
  });
});

// ===================
// Start Server
// ===================
app.listen(PORT, () => {
  console.log(`
🚀 Blockchain Email Server Running!
📍 Port: ${PORT}
📧 Ready to send secure emails!
🔗 Endpoints:
   • POST /send-email
   • GET  /blockchain
  `);
});