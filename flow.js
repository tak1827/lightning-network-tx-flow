const { BlockChain, createNewBlock, mineBlock } = require('./block');
const { Transaction, TxIn, TxOut, calculateTxHash, signTx, validateTx } = require('./transaction');
const { AliceKeys, BobKeys, getPubKeyHash, redeemScript, redeemScriptHash } = require('./wallet');

// Create blockchain
let Blocks = Object.assign([], BlockChain);


/***************************
 1. Multi-signature Funding 
****************************/
const gTxH = calculateTxHash(Blocks[0].txs[0]);

// Create unsingned transaction
let fundingTxAlice = new Transaction(
  [
    new TxIn(
      gTxH,
      0, 
      { 
        type: 'SINGLE', 
        sig: getPubKeyHash(AliceKeys[0]) // Place pubKeyHash for signing instead.
      }
    )
  ],
  [
    new TxOut(
      50000000, 
      { 
        type: 'NORMAL', 
        pubKeyHash: redeemScriptHash 
      }
    )
  ]
);

let fundingTxBob = new Transaction(
  [
    new TxIn(
      gTxH,
      1, 
      { type: 'SINGLE', sig: Blocks[0].txs[0].txOuts[1].scriptPubKey.pubKeyHash }
    )
  ],
  [new TxOut(50000000, { type: 'NORMAL', pubKeyHash: redeemScriptHash })]
);

// Sign transaction
fundingTxAlice = signTx(fundingTxAlice, AliceKeys[0]);
fundingTxBob = signTx(fundingTxBob, BobKeys[0]);

// Mine block as adding transactions
Blocks = mineBlock(
  Blocks, 
  createNewBlock([fundingTxAlice, fundingTxBob], Blocks)
);


/*******************************
 2. Build C1a and C1b (No sign)
********************************/
const fTxAH = calculateTxHash(fundingTxAlice);
const fTxBH = calculateTxHash(fundingTxBob);

let C1a = new Transaction(
  [
    new TxIn(
      fTxAH, 
      0, 
      { 
        type: 'MULTI',
        sig: [ 
          redeemScript.pubKeyHashs[0], 
          redeemScript.pubKeyHashs[1] 
        ],
        redeemScript
      }
    ),
    new TxIn(
      fTxBH,
      0, 
      { 
        type: 'MULTI',
        sig: [ 
          redeemScript.pubKeyHashs[0], 
          redeemScript.pubKeyHashs[1] 
        ],
        redeemScript
      }
    )
  ],
  [
    new TxOut(
      50000000, 
      { 
        type: 'RSMS',
        pubKeyHash: [ 
          getPubKeyHash(AliceKeys[2]), 
          getPubKeyHash(BobKeys[2]) 
        ]
      }
    ),
    new TxOut(
      50000000, 
      { 
        type: 'NORMAL',
        pubKeyHash: getPubKeyHash(BobKeys[2])
      }
    )
  ]
)

let C1b = new Transaction(
  [
    new TxIn(
      fTxAH, 
      0, 
      { 
        type: 'MULTI',
        sig: [ 
          redeemScript.pubKeyHashs[0], 
          redeemScript.pubKeyHashs[1] 
        ],
        redeemScript
      }
    ),
    new TxIn(
      fTxBH,
      0, 
      { 
        type: 'MULTI',
        sig: [ 
          redeemScript.pubKeyHashs[0], 
          redeemScript.pubKeyHashs[1] 
        ],
        redeemScript
      }
    )
  ],
  [
    new TxOut(
      50000000, 
      { 
        type: 'NORMAL',
        pubKeyHash: getPubKeyHash(AliceKeys[2])
      }
    ),
    new TxOut(
      50000000, 
      { 
        type: 'RSMS',
        pubKeyHash: [ 
          getPubKeyHash(AliceKeys[2]), 
          getPubKeyHash(BobKeys[2]) 
        ]
      }
    )

  ]
)


/*******************************
 3. Build RD1a and RD1b
********************************/
let RD1a = new Transaction(
  [
    new TxIn(
      '', // Keep empty because C1a have not yet spent
      0, 
      { 
        type: 'RD',
        sig: [ 
          getPubKeyHash(AliceKeys[2]), 
          getPubKeyHash(BobKeys[2]) 
        ],
        sequence: 3
      }
    ),
  ],
  [
    new TxOut(
      50000000, 
      { 
        type: 'NORMAL',
        pubKeyHash: getPubKeyHash(AliceKeys[3])
      }
    )
  ]
);

let RD1b = new Transaction(
  [
    new TxIn(
      '', 
      1, 
      { 
        type: 'RD',
        sig: [ 
          getPubKeyHash(AliceKeys[2]), 
          getPubKeyHash(BobKeys[2]) 
        ],
        sequence: 3
      }
    ),
  ],
  [
    new TxOut(
      50000000, 
      { 
        type: 'NORMAL',
        pubKeyHash: getPubKeyHash(BobKeys[3])
      }
    )
  ]
);

// Hand over RD1a to Bob and let him sign
RD1a = signTx(RD1a, BobKeys[2]);

// Hand over RD1b to Alice and let her sign
RD1b = signTx(RD1b, AliceKeys[2]);


/*************************************
 4. Exchange signature of C1a and C1b
**************************************/
C1a = signTx(C1a, BobKeys[1]);
C1b = signTx(C1b, AliceKeys[1]);


/*********************************
 5. Spend C1b
**********************************/

// Sign by himself(Bob)
C1b = signTx(C1b, BobKeys[1]);

// Validate transaction
validateTx(C1b, Blocks);

// Mine block as adding transactions
Blocks = mineBlock(Blocks, createNewBlock([C1b], Blocks));


/*********************************
 6. Spend D1b
**********************************/
const hashC1b = calculateTxHash(C1b);

let D1b = new Transaction(
  [
    new TxIn(
      hashC1b, 
      0, 
      { 
        type: 'SINGLE',
        sig: [ getPubKeyHash(AliceKeys[2]) ],
      }
    )
  ],
  [
    new TxOut(
      50000000, 
      { 
        type: 'NORMAL',
        pubKeyHash: getPubKeyHash(AliceKeys[3])
      }
    )
  ]
)

D1b = signTx(D1b, AliceKeys[2]);

validateTx(D1b, Blocks);

Blocks = mineBlock(Blocks, createNewBlock([D1b], Blocks));


/*********************************
 7. Spend RD1b
**********************************/

// Set previous transaction hash to txIn
RD1b.txIns[0].txPrev = calculateTxHash(C1b);

RD1b = signTx(RD1b, BobKeys[2]);

validateTx(RD1b, Blocks); // => Fail, because of block time lock

// Add 2 blocks for time lock
Blocks = mineBlock(Blocks, createNewBlock([], Blocks));
Blocks = mineBlock(Blocks, createNewBlock([], Blocks));

validateTx(RD1b, Blocks); // => Success, because time lock expire

Blocks = mineBlock(Blocks, createNewBlock([RD1b], Blocks));
