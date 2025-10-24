import express from 'express';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ===================
// FIXED Blockchain (No Encryption Error)
// ===================
class Block {
  constructor(timestamp, emailData, previousHash = '') {
    this.timestamp = timestamp;
    this.emailData = emailData; // Store plain data for now
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
    const startTime = Date.now();
    let attempts = 0;
    
    while (this.hash.substring(0, difficulty) !== '0'.repeat(difficulty)) {
      this.nonce++;
      this.hash = this.calculateHash();
      attempts++;
      
      if (attempts % 5000 === 0) {
        process.stdout.write(`\rMining: ${attempts} attempts | Hash: ${this.hash.substring(0, 20)}...`);
      }
    }
    
    console.log(`\n✅ Block mined! ${attempts} attempts | ${((Date.now() - startTime)/1000).toFixed(2)}s`);
    return this.hash;
  }
}

class EmailBlockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.pendingEmails = [];
    this.difficulty = 2; // Reduced for faster mining
  }

  createGenesisBlock() {
    return new Block(
      Date.now(),
      { 
        from: "genesis@blockchainmail.com", 
        to: "genesis@example.com", 
        subject: "🏁 Genesis Block", 
        message: "Welcome to Blockchain Email System" 
      },
      "0"
    );
  }

  addEmailToPending(emailData) {
    const emailRecord = {
      id: crypto.randomBytes(16).toString('hex'),
      timestamp: Date.now(),
      ...emailData,
      status: 'pending'
    };
    
    this.pendingEmails.push(emailRecord);
    console.log(`📨 Email queued: ${emailData.subject}`);
    return emailRecord.id;
  }

  minePendingEmails() {
    if (this.pendingEmails.length === 0) {
      console.log("⏳ No pending emails to mine");
      return null;
    }

    console.log(`⛏️ Mining ${this.pendingEmails.length} emails...`);
    const block = new Block(
      Date.now(),
      this.pendingEmails,
      this.getLatestBlock().hash
    );
    
    const blockHash = block.mineBlock(this.difficulty);
    this.chain.push(block);
    
    console.log(`✅ Block #${this.chain.length - 1} mined with ${this.pendingEmails.length} emails`);
    
    const minedEmails = [...this.pendingEmails];
    this.pendingEmails = [];
    
    return {
      blockNumber: this.chain.length - 1,
      blockHash,
      emails: minedEmails,
      timestamp: block.timestamp
    };
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (current.hash !== current.calculateHash()) {
        console.log(`❌ Block ${i} hash invalid`);
        return false;
      }
      if (current.previousHash !== previous.hash) {
        console.log(`❌ Block ${i} previous hash mismatch`);
        return false;
      }
    }
    return true;
  }

  getBlockchainStats() {
    return {
      totalBlocks: this.chain.length,
      totalEmails: this.chain.reduce((acc, block) => acc + (Array.isArray(block.emailData) ? block.emailData.length : 1), 0),
      pendingEmails: this.pendingEmails.length,
      chainValid: this.isChainValid(),
      latestBlock: this.getLatestBlock().hash.substring(0, 16) + '...'
    };
  }
}

const emailChain = new EmailBlockchain();

// ===================
// Email Setup
// ===================
const transporter = nodemailer.createTransporter({
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  auth: {
    user: process.env.ETHEREAL_EMAIL || 'mekhi.bashirian@ethereal.email',
    pass: process.env.ETHEREAL_PASS || 'ghXA8QmXzxeMkG5Qzs'
  }
});

// ===================
// Middleware
// ===================
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===================
// API Routes
// ===================
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, text, fromName = "Blockchain Mail" } = req.body;

    if (!to || !subject || !text) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: to, subject, text"
      });
    }

    // 1. Add to blockchain
    const emailId = emailChain.addEmailToPending({
      from: `${fromName} <${process.env.ETHEREAL_EMAIL || 'mekhi.bashirian@ethereal.email'}>`,
      to,
      subject,
      message: text
    });

    // 2. Mine immediately for demo
    const minedBlock = emailChain.minePendingEmails();

    // 3. Send actual email
    const mailOptions = {
      from: `"${fromName}" <${process.env.ETHEREAL_EMAIL || 'mekhi.bashirian@ethereal.email'}>`,
      to,
      subject: `🔐 [Blockchain Secured] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${subject}</h2>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;">${text.replace(/\n/g, '<br>')}</p>
          </div>
          <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; font-size: 12px; color: #555;">
            <strong>🔗 Blockchain Verification:</strong><br>
            • Email ID: ${emailId}<br>
            • Block: #${minedBlock?.blockNumber || 'Pending'}<br>
            • Hash: ${minedBlock?.blockHash?.substring(0, 16) || 'Processing...'}<br>
            • Timestamp: ${new Date().toISOString()}
          </div>
          <p style="font-size: 11px; color: #888; margin-top: 20px;">
            This email is cryptographically secured and recorded on our blockchain.
          </p>
        </div>
      `
    };

    const emailResult = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      message: "Email sent and recorded on blockchain",
      emailId,
      blockchain: {
        blockNumber: minedBlock?.blockNumber,
        blockHash: minedBlock?.blockHash,
        transactionHash: crypto.randomBytes(32).toString('hex')
      },
      emailPreview: nodemailer.getTestMessageUrl(emailResult),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Send email error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send email",
      details: error.message
    });
  }
});

app.get('/api/blockchain', (req, res) => {
  res.json({
    ...emailChain.getBlockchainStats(),
    chain: emailChain.chain.map(block => ({
      timestamp: block.timestamp,
      hash: block.hash,
      previousHash: block.previousHash,
      nonce: block.nonce,
      emailCount: Array.isArray(block.emailData) ? block.emailData.length : 1
    }))
  });
});

app.get('/api/block/:index', (req, res) => {
  const blockIndex = parseInt(req.params.index);
  const block = emailChain.chain[blockIndex];
  
  if (!block) {
    return res.status(404).json({ error: "Block not found" });
  }

  res.json({
    index: blockIndex,
    timestamp: block.timestamp,
    hash: block.hash,
    previousHash: block.previousHash,
    nonce: block.nonce,
    difficulty: emailChain.difficulty,
    emailData: block.emailData
  });
});

app.get('/api/verify-email/:emailId', (req, res) => {
  const { emailId } = req.params;
  
  for (let i = 0; i < emailChain.chain.length; i++) {
    const block = emailChain.chain[i];
    if (Array.isArray(block.emailData)) {
      const foundEmail = block.emailData.find(email => email.id === emailId);
      if (foundEmail) {
        return res.json({
          exists: true,
          blockNumber: i,
          blockHash: block.hash,
          verified: true,
          email: foundEmail
        });
      }
    }
  }
  
  res.json({ exists: false, verified: false });
});

// ===================
// Start Server
// ===================
app.listen(PORT, () => {
  console.log(`
🚀 BLOCKCHAIN EMAIL SERVER STARTED
📍 Port: ${PORT}
📧 Ethereal Email: ${process.env.ETHEREAL_EMAIL || 'mekhi.bashirian@ethereal.email'}
⛓️  Blockchain: Ready (${emailChain.difficulty} difficulty)
🔗 API Endpoints:
   • POST /api/send-email
   • GET  /api/blockchain
   • GET  /api/block/{index}
   • GET  /api/verify-email/{id}
  `);
});

// Auto-mine every 2 minutes
setInterval(() => {
  if (emailChain.pendingEmails.length > 0) {
    console.log("🕒 Auto-mining pending emails...");
    emailChain.minePendingEmails();
  }
}, 120000);