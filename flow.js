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
 5. Build C2a and C2b (No sign)
**********************************/
let C2a = new Transaction(
  [
    new TxIn( // This is same as C1a
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
    new TxIn( // This is same as C1a
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
      40000000, 
      { 
        type: 'RSMS',
        pubKeyHash: [ 
          getPubKeyHash(AliceKeys[4]), 
          getPubKeyHash(BobKeys[4]) 
        ]
      }
    ),
    new TxOut(
      60000000, 
      { 
        type: 'NORMAL',
        pubKeyHash: getPubKeyHash(BobKeys[4])
      }
    )
  ]
)

let C2b = new Transaction(
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
      40000000, 
      { 
        type: 'NORMAL',
        pubKeyHash: getPubKeyHash(AliceKeys[4])
      }
    ),
    new TxOut(
      60000000, 
      { 
        type: 'RSMS',
        pubKeyHash: [ 
          getPubKeyHash(AliceKeys[4]), 
          getPubKeyHash(BobKeys[4]) 
        ]
      }
    )
  ]
)


/*********************************
 6. Build RD2a and RD2b
**********************************/
// This is almost same as RD1a and RD1b
// So, let me skip


/*************************************
 7. Exchange signature of C2a and C2b
**************************************/

// Alice hand over C2a to Bob, and let him sign
C2a = signTx(C2a, BobKeys[1]);

// Bob hand over C2a to Alice, and let her sign
C2b = signTx(C2b, AliceKeys[1]);


/*************************************
 8. Build BR1a and BR1b
**************************************/
let BR1a = new Transaction(
  [
    new TxIn(
      '', // Keep empty because C1a have not yet spent
      0, 
      { 
        type: 'BR',
        sig: [ 
          getPubKeyHash(AliceKeys[2]), 
          getPubKeyHash(BobKeys[2]) 
        ],
      }
    )
  ],
  [
    new TxOut(
      50000000, 
      { 
        type: 'NORMAL',
        pubKeyHash: getPubKeyHash(BobKeys[3]) // For Bob
      }
    )
  ]
)

let BR1b = new Transaction(
  [
    new TxIn(
      '', 
      1, 
      { 
        type: 'BR',
        sig: [ 
          getPubKeyHash(AliceKeys[2]), 
          getPubKeyHash(BobKeys[2]) 
        ],
      }
    )
  ],
  [
    new TxOut(
      50000000, 
      { 
        type: 'NORMAL',
        pubKeyHash: getPubKeyHash(AliceKeys[3]) // For Alice
      }
    )
  ]
)

// Alice hand over signed BR1a to Bob. This output is for Bob
BR1a = signTx(BR1a, AliceKeys[2]);

// Bob hand over singed BR1b to Alice. This output is for Alice
BR1b = signTx(BR1b, BobKeys[2]);


/*************************************
 9. Spend C1b
**************************************/

// Sign by himself(Bob)
C1b = signTx(C1b, BobKeys[1]);

// Validate transaction
validateTx(C1b, Blocks);

// Mine block as adding transactions
Blocks = mineBlock(Blocks, createNewBlock([C1b], Blocks));


/*************************************
 10. Spend BR1b
**************************************/

// Set C1b transaction hash
BR1b.txIns[0].txPrev = calculateTxHash(C1b);

// Inherently, this Bitcoin is for Bob, but now belong to Alice.
// Bob lose for his breach.
BR1b = signTx(BR1b, AliceKeys[2]);

validateTx(BR1b, Blocks);

Blocks.push( createNewBlock([BR1a], Blocks) );
