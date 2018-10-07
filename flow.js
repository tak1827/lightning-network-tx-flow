const { BlockChain, createNewBlock, mineBlock } = require('./block');
const { Transaction, TxIn, TxOut, calculateTxHash, signTx, validateTx } = require('./transaction');
const { AliceKeys, BobKeys, getPubKeyHash, redeemScript, redeemScriptHash, generatePrivateKey, getPubKey } = require('./wallet');

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

// Use private key as preimage R
const preimageR = generatePrivateKey();

// Preimage H is public key
const preimageH = getPubKey(preimageR);

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
      50000000, 
      { 
        type: 'NORMAL',
        pubKeyHash: getPubKeyHash(BobKeys[4])
      }
    ),
    new TxOut(
      10000000, 
      { 
        type: 'HTLC',
        pubKeyHash: [
          getPubKeyHash(AliceKeys[4]),
          getPubKeyHash(BobKeys[4])
        ],
        preimageH // Alice provide H, Bob need to know R
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
    ),
    new TxOut(
      10000000, 
      { 
        type: 'HTLC',
        pubKeyHash: [
          getPubKeyHash(AliceKeys[4]),
          getPubKeyHash(BobKeys[4])
        ],
        preimageH // Bob provide H, Alice need to know R
      }
    )
  ]
)


/*********************************
 6. Build RD2a and RD2b
**********************************/
// This is almost same as RD1a and RD1b
// So, let me skip


/*********************************
 7. Build HT1a and HTD1b
**********************************/
let HT1a = new Transaction(
  [
    new TxIn(
      '', 
      2, 
      { 
        type: 'HTLCT',
        sig: [ 
          getPubKeyHash(AliceKeys[4]), 
          getPubKeyHash(BobKeys[4])
        ],
        sequence: 3 // 3 block confirmation time lock
      }
    )
  ],
  [
    new TxOut(
      10000000, 
      { 
        type: 'RSMS',
        pubKeyHash: [ 
          getPubKeyHash(AliceKeys[5]), 
          getPubKeyHash(BobKeys[5]) 
        ]
      }
    )
  ]
)

let HTD1b = new Transaction(
  [
    new TxIn(
      '', 
      2, 
      { 
        type: 'HTLCT',
        sig: [ 
          getPubKeyHash(AliceKeys[4]), 
          getPubKeyHash(BobKeys[4])
        ],
        sequence: 3 // 3 block confirmation time lock
      }
    )
  ],
  [
    new TxOut(
      10000000, 
      { 
        type: 'NORMAL',
        pubKeyHash: getPubKeyHash(AliceKeys[5])
      }
    )
  ]
)

// Alice hand over HT1a to Bob and let him sign
HT1a = signTx(HT1a, BobKeys[4]);

// Alice hand over HTD1b to Bob and let him sign
HTD1b = signTx(HTD1b, BobKeys[4]);


/*********************************
 8. Build HED1a and HE1b
**********************************/

let HED1a = new Transaction(
  [
    new TxIn(
      '', 
      2, 
      { 
        type: 'HTLCE',
        sig: [ 
          getPubKeyHash(AliceKeys[4]), 
          getPubKeyHash(BobKeys[4])
        ],
        preimageR // Bob answer required R
      }
    )
  ],
  [
    new TxOut(
      10000000, 
      { 
        type: 'NORMAL',
        pubKeyHash: getPubKeyHash(BobKeys[5])
      }
    )
  ]
)

let HE1b = new Transaction(
  [
    new TxIn(
      '', 
      2, 
      { 
        type: 'HTLCE',
        sig: [ 
          getPubKeyHash(AliceKeys[4]), 
          getPubKeyHash(BobKeys[4])
        ],
        preimageR // Bob answer required R
      }
    )
  ],
  [
    new TxOut(
      10000000, 
      { 
        type: 'RSMS',
        pubKeyHash: [ 
          getPubKeyHash(AliceKeys[5]), 
          getPubKeyHash(BobKeys[5]) 
        ]
      }
    )
  ]
)

// Bob hand over HED1a to Alice and let her sign
HED1a = signTx(HED1a, AliceKeys[4]);

// Bob hand over HE1b to Alice and let her sign
HE1b = signTx(HE1b, AliceKeys[4]);


/*********************************
 9. Build HTRD1a and HERD1b
**********************************/

let HTRD1a = new Transaction(
  [
    new TxIn(
      '', 
      0, 
      { 
        type: 'RD',
        sig: [ 
          getPubKeyHash(AliceKeys[5]), 
          getPubKeyHash(BobKeys[5])
        ],
        sequence: 10 // 10 block confirmation time lock
      }
    )
  ],
  [
    new TxOut(
      10000000, 
      { 
        type: 'NORMAL',
        pubKeyHash: getPubKeyHash(AliceKeys[6])
      }
    )
  ]
)

let HERD1b = new Transaction(
  [
    new TxIn(
      '', 
      0, 
      { 
        type: 'RD',
        sig: [ 
          getPubKeyHash(AliceKeys[5]), 
          getPubKeyHash(BobKeys[5])
        ],
        sequence: 10 // 10 block confirmation time lock
      }
    )
  ],
  [
    new TxOut(
      10000000, 
      { 
        type: 'NORMAL',
        pubKeyHash: getPubKeyHash(BobKeys[6])
      }
    )
  ]
)

// Alice hand over HTRD1a to Bob and let him sign
HTRD1a = signTx(HTRD1a, BobKeys[5]);

// Bob hand over HERD1b to Alice and let her sign
HERD1b = signTx(HERD1b, AliceKeys[5]);

/**************************************
 10. Exchange signature of C2a and C2b
***************************************/

// Alice hand over C2a to Bob, and let him sign
C2a = signTx(C2a, BobKeys[1]);

// Bob hand over C2a to Alice, and let her sign
C2b = signTx(C2b, AliceKeys[1]);


/*************************************
 11. Build BR1a and BR1b
**************************************/
// Skip. Please refer to 'spend-BR' branch


/*************************************
 12. Spend C2b
**************************************/

// Sign by himself(Bob)
C2b = signTx(C2b, BobKeys[1]);

// Validate transaction
validateTx(C2b, Blocks);

// Mine block as adding transactions
Blocks = mineBlock(Blocks, createNewBlock([C2b], Blocks));


// /*************************************
//  13. Spend HTD1b
// **************************************/

// // Set C2b transaction hash
// HTD1b.txIns[0].txPrev = calculateTxHash(C2b);

// HTD1b = signTx(HTD1b, AliceKeys[4]);

// Blocks = mineBlock(Blocks, createNewBlock([], Blocks));
// Blocks = mineBlock(Blocks, createNewBlock([], Blocks));
// Blocks = mineBlock(Blocks, createNewBlock([], Blocks));

// validateTx(HTD1b, Blocks);

// Blocks.push( createNewBlock([HTD1b], Blocks) );


/*************************************
 13. Spend HE1b
**************************************/

// Set C2b transaction hash
HE1b.txIns[0].txPrev = calculateTxHash(C2b);

HE1b = signTx(HE1b, BobKeys[4]);

validateTx(HE1b, Blocks);

Blocks.push( createNewBlock([HE1b], Blocks) );



/*************************************
 14. Spend HERD1b
**************************************/

// Set HE1b transaction hash
HERD1b.txIns[0].txPrev = calculateTxHash(HE1b);

HERD1b = signTx(HERD1b, BobKeys[5]);

// Wait 10 confirmations for time lock
Blocks = mineBlock(Blocks, createNewBlock([], Blocks));
Blocks = mineBlock(Blocks, createNewBlock([], Blocks));
Blocks = mineBlock(Blocks, createNewBlock([], Blocks));
Blocks = mineBlock(Blocks, createNewBlock([], Blocks));
Blocks = mineBlock(Blocks, createNewBlock([], Blocks));
Blocks = mineBlock(Blocks, createNewBlock([], Blocks));
Blocks = mineBlock(Blocks, createNewBlock([], Blocks));
Blocks = mineBlock(Blocks, createNewBlock([], Blocks));
Blocks = mineBlock(Blocks, createNewBlock([], Blocks));
Blocks = mineBlock(Blocks, createNewBlock([], Blocks));

validateTx(HERD1b, Blocks);

Blocks.push( createNewBlock([HERD1b], Blocks) );

// console.log(JSON.stringify(HERD1b))
