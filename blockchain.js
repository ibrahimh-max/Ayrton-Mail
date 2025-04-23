const crypto = require('crypto');

class Block {
  constructor(timestamp, emailData, previousHash = '') {
    this.timestamp = timestamp;
    this.emailData = emailData; // {to, subject, message}
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
    this.nonce = 0; // For mining simulation
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
    while (
      this.hash.substring(0, difficulty) !== 
      Array(difficulty + 1).join("0")
    ) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log(`Block mined: ${this.hash}`);
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 2; // Adjust for faster/slower mining
    this.pendingEmails = [];
  }

  createGenesisBlock() {
    return new Block(
      "01/01/2023", 
      {to: "genesis", subject: "Genesis", message: "First block"}, 
      "0"
    );
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addEmailToPending(emailData) {
    this.pendingEmails.push(emailData);
  }

  minePendingEmails() {
    let block = new Block(
      Date.now(),
      this.pendingEmails,
      this.getLatestBlock().hash
    );
    block.mineBlock(this.difficulty);
    
    this.chain.push(block);
    this.pendingEmails = [];
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }
}

module.exports = Blockchain;
