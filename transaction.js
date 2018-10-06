const CryptoJS = require('crypto-js');
const Elliptic = require('elliptic').ec;
const EC = new Elliptic('secp256k1');
const Assert = require('assert');

const { getPubKey, getPubKeyHash, calculatePubKeyHash } = require('./wallet');


class Transaction {
  constructor(txIns, txOuts) {
    this.txIns = txIns;
    this.txOuts = txOuts;
  }
}

class TxIn {
  constructor(txPrev, index, scriptSig) {
    this.txPrev = txPrev;
    this.index = index;
    this.scriptSig = scriptSig;
  }
}

class TxOut {
  constructor(value, scriptPubKey) {
    this.value = value;
    this.scriptPubKey = scriptPubKey;
  }
}

function toHexString(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
};

function buildUnsignedScriptSig(scriptSig) {

  if (scriptSig.type === 'SINGLE') {
    return {
      type: scriptSig.type,
      sig: typeof scriptSig.sig.pubKey === 'undefined'
        ? scriptSig.sig
        : calculatePubKeyHash(scriptSig.sig.pubKey)
    };

  } else if (scriptSig.type === 'MULTI') {
    return {
      type: scriptSig.type,
      sig: scriptSig.sig.map(sig => {
        typeof sig.pubKey === 'undefined'
          ? sig
          : calculatePubKeyHash(sig.pubKey)
      }),
      redeemScript: scriptSig.redeemScript
    };
  }
}

function buildScriptSig(scriptSig, txHash, privateKey) {

  const key = EC.keyFromPrivate(privateKey, 'hex');

  if (scriptSig.type === 'SINGLE') {
    return {
      type: scriptSig.type,
      sig: { 
        signature: toHexString(key.sign(txHash).toDER()),
        pubKey: getPubKey(privateKey)
      }
    };

  } else if (scriptSig.type === 'MULTI') {
    return {
      type: scriptSig.type,
      sig: scriptSig.sig.map(sig => {
        return sig === getPubKeyHash(privateKey)
          ? {
              signature: toHexString(key.sign(txHash).toDER()),
              pubKey: getPubKey(privateKey)
            }
          : sig
      }),
      redeemScript: scriptSig.redeemScript
    };

  } else if (scriptSig.type === 'RD') {
    return {
      type: scriptSig.type,
      sig: scriptSig.sig.map(sig => {
        return sig === getPubKeyHash(privateKey)
          ? {
              signature: toHexString(key.sign(txHash).toDER()),
              pubKey: getPubKey(privateKey),
            }
          : sig
        }),
      sequence: scriptSig.sequence
    };

  } else if (scriptSig.type === 'BR') {
    return {
      type: scriptSig.type,
      sig: scriptSig.sig.map(sig => {
        return sig === getPubKeyHash(privateKey)
          ? {
              signature: toHexString(key.sign(txHash).toDER()),
              pubKey: getPubKey(privateKey),
            }
          : sig
      })
    };
  }
}

function buildUnsignTx(tx) {
  return new Transaction(
    tx.txIns.map(txIn => {
      return new TxIn(
        txIn.txPrev, 
        txIn.index,
        buildUnsignedScriptSig(txIn.scriptSig)
      )
    }),
    tx.txOuts
  );
}

function signTx(tx, privateKey) {

  const unsignedTx = buildUnsignTx(tx);

  // Parent transaction have not yet spent so that keep txIns empty then calculate hash
  if (tx.txIns[0].scriptSig.type === 'RD' || tx.txIns[0].scriptSig.type === 'BR') {
    unsignedTx.txIns = [];
  }

  const txHash = calculateTxHash(unsignedTx);

  return new Transaction(
    tx.txIns.map(txIn => {
      return new TxIn(
        txIn.txPrev, 
        txIn.index, 
        buildScriptSig(txIn.scriptSig, txHash, privateKey)
      )
    }),
    tx.txOuts,
  );
}

function calculateTxHash(tx) {

  const concatedStr = Object.keys(tx)
    .map((key) => {
      if (key === 'txIns') {
        return tx.txIns.length === 0
          ? ""
          : tx.txIns
            .map(txIn => txIn.txPrev + txIn.index + JSON.stringify(txIn.scriptSig))
            .reduce((ac, cu) => ac + cu);
      } else if (key === 'txOuts') {
        return tx.txOuts.length === 0
          ? ""
          : tx.txOuts
            .map(txOut => txOut.value + JSON.stringify(txOut.scriptPubKey))
            .reduce((ac, cu) => ac + cu);
      }
      return tx[key];
    })
    .reduce((ac, cu) => ac + cu);

  return CryptoJS.SHA256(CryptoJS.SHA256(concatedStr)).toString();
}

function findTx(txHash, Blocks) {
  const blockTxs = Blocks.map(block => block.txs).reduce((ac, cu) => ac.concat(cu), []);
  return blockTxs.find(tx => calculateTxHash(tx) === txHash);
}

function findUnspentTxIn(txHash, index, Blocks) {
  const blockTxs = Blocks.map(block => block.txs).reduce((ac, cu) => ac.concat(cu), []);
  const spentTxIns = blockTxs.map(tx => tx.txIns).reduce((ac, cu) => ac.concat(cu), []);
  return spentTxIns.find(txIn => txIn.txPrev === txHash && txIn.index === index);
}

function getBlockHeight(txNow, Blocks) {
  const txHash = calculateTxHash(txNow);

  return Blocks.findIndex(block => {
    return block.txs.find(tx => calculateTxHash(tx) === txHash);
  });
}

function validateTx(txNow, Blocks) {

  txNow.txIns.forEach(txInNow => {

    const foundTx = findTx(txInNow.txPrev, Blocks);

    Assert(foundTx,
      "txPrev don't exist in Block " + JSON.stringify(txInNow)
    )

    Assert(!findUnspentTxIn(txInNow.txPrev, txInNow.index, Blocks),
      "txIn have already spent " + JSON.stringify(txInNow)
    )

    Assert(validateTxIn(txInNow, txNow, foundTx, Blocks));
  });

  return true;
}

function validateTxIn(txIn, txNow, txPrev, Blocks) {

  if (txIn.scriptSig.type === 'SINGLE') {

    const pubKeyHash = calculatePubKeyHash(txIn.scriptSig.sig.pubKey);

    Assert.equal(pubKeyHash, txPrev.txOuts[txIn.index].scriptPubKey.pubKeyHash,
      "txIn.scriptSig don't correspond with pubKeyHash " + JSON.stringify(txIn)
    )

  } else if (txIn.scriptSig.type === 'MULTI') {
    
    const rshash = CryptoJS.RIPEMD160(CryptoJS.SHA256(
      JSON.stringify(txIn.scriptSig.redeemScript)
    )).toString();

    Assert.equal(rshash, txPrev.txOuts[txIn.index].scriptPubKey.pubKeyHash,
      "redeemScript don't correspond with pubKeyHash " + JSON.stringify(txIn)
    )

    Assert(txIn.scriptSig.sig.length >= txIn.scriptSig.redeemScript.m,
      "signature is not enough " + JSON.stringify(txIn)
    )

  } else if (txIn.scriptSig.type === 'RD') {

    const blockHeightNow = Blocks.length;
    const lockedBlockHeigh = getBlockHeight(txPrev, Blocks) + 
      txIn.scriptSig.sequence;

    Assert(blockHeightNow > lockedBlockHeigh,
      "txIn is still locked " + JSON.stringify(txIn)
    )

    txIn.scriptSig.sig.map((sig, i) => {
      const pubKeyHash = calculatePubKeyHash(sig.pubKey);
      Assert.equal(pubKeyHash, txPrev.txOuts[txIn.index].scriptPubKey.pubKeyHash[i],
        "txIn.scriptSig don't correspond with pubKeyHash " + JSON.stringify(txIn)
      )
    });
  
  } else if (txIn.scriptSig.type === 'BR') {

    txIn.scriptSig.sig.map((sig, i) => {
      const pubKeyHash = calculatePubKeyHash(sig.pubKey);
      Assert.equal(pubKeyHash, txPrev.txOuts[txIn.index].scriptPubKey.pubKeyHash[i],
        "txIn.scriptSig don't correspond with pubKeyHash " + JSON.stringify(txIn)
      )
    });
    
  }

  verifySig(txIn.scriptSig.type, txNow, txIn.scriptSig.sig);

  return true;
};

function verifySig(type, tx, sig) {

  const txHash = calculateTxHash(buildUnsignTx(tx));

  if (type === 'SINGLE') {    
    const key = EC.keyFromPublic(sig.pubKey, 'hex');
    key.verify(txHash, sig.signature)

  } else {
    sig.map(sig => {
      const key = EC.keyFromPublic(sig.pubKey, 'hex');
      key.verify(txHash, sig.signature);
    })
  }
}

module.exports = { 
  Transaction, TxIn, TxOut, calculateTxHash, buildUnsignTx, signTx, validateTx
};
