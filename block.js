const CryptoJS = require('crypto-js');
const { Transaction, TxIn, TxOut, calculateTxHash } = require('./transaction');
const { AliceKeys, BobKeys, getPubKeyHash } = require('./wallet');

class Block {
  constructor(hashPrev, txs) {
    this.hashPrev = hashPrev;
    this.txs = txs;
  }
}

// Genesis block
const genesis = new Block(
  '0000000000000000000000000000000000000000000000000000000000000000',
  [
    new Transaction(
      [],
      [
        new TxOut( // Bitcoin for Alice
          50000000,
          {
            type: 'NORMAL',
            pubKeyHash: getPubKeyHash( AliceKeys[0] ),
          } 
        ),
        new TxOut( // Bitcoin for Bob
          50000000, 
          {
            type: 'NORMAL',
            pubKeyHash: getPubKeyHash( BobKeys[0] )
          }
        )
      ]
    )
  ]
);

// Blockchain
const BlockChain = [genesis];

function calculateBlockHash(block) {

  const concatedStr = Object.keys(block)
    .map(key => {
      return key === 'hashPrev' || block[key].length === 0
        ? block[key]
        : block[key]
          .map(tx => calculateTxHash(tx))
          .reduce((ac, cu) => ac + cu)
    })
    .reduce((ac, cu) => ac + cu);

  return CryptoJS.SHA256(CryptoJS.SHA256(concatedStr)).toString();
}

function createNewBlock(txs, Blocks) {
  const latestBlock = Blocks[Blocks.length -1];
  const hashPrev = calculateBlockHash(latestBlock);

  return new Block(hashPrev, txs);
}

function mineBlock(blocks, block) {
	let Blocks = Object.assign([], blocks);
	Blocks.push(block);
	return Blocks;
}

module.exports = {
	Block, BlockChain, createNewBlock, mineBlock
};
