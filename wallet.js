const CryptoJS = require('crypto-js');
const Elliptic = require('elliptic').ec;
const EC = new Elliptic('secp256k1');

// Private keys of Alice
const AliceKeys = [
  '6374bba8dee5463e921785c74818ff00f9f6155151b99465715486f4916784b0',
  'c0a841874a243335b339a671e6df2bcc76ce038d43515425c7e7eda20e93ba4',
  'a5afe9a23b495b4b8e8abd8bb451a91407b746f5e8116cc4ff478d4dac81b182',
  'd799c8743ac88c17fc290bfcd4865914665c2b591757de43b5774405f013a92a',
  '640819c07625cfa9ff32b5b5bb5170f2ee419c10e34ab69b9dedb435cccbbf6e'
]

// Private keys of Bob
const BobKeys = [
  '991721b2b620087fd5006fe9c6855354bc965771f0f1b4f62afc77483f191202',
  '7f1b27a5f468327c6bc33d50f0fa60aac9bddf547fa8978d6021695ef785277',
  '36803c2b67e72a47113f80bd2bc9bdb4370f45850acce00a0d45ae8ffc2f1529',
  '21ce41ef2389dd68281d55c3786f6ed5d94bedc549f159f019ca12aeaeda879b',
  '5ebed1145f9288265ef8448e4f7ddbcb9165153b92a2061fc974cccb7833bec8'
]

// Multi signature of Alice and Bob
const redeemScript = { 
  n: 2, 
  m: 2, 
  pubKeyHashs: [ 
    getPubKeyHash(AliceKeys[1]), // Alice pubKeyHash
    getPubKeyHash(BobKeys[1]) // Bob pubKeyHash
  ]
}

const redeemScriptHash = CryptoJS.RIPEMD160(CryptoJS.SHA256(
  JSON.stringify(redeemScript)
)).toString();

function generatePrivateKey() {
  const keyPair = EC.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
};

function getPubKey(privateKey) {
  const key = EC.keyFromPrivate(privateKey, 'hex');
  return key.getPublic().encode('hex');
}

function calculatePubKeyHash(pubKey) {
  return CryptoJS.RIPEMD160(CryptoJS.SHA256(pubKey)).toString();
}

function getPubKeyHash(privateKey) {
  const pubKey = getPubKey(privateKey);
  return calculatePubKeyHash(pubKey);
}

module.exports = { 
	AliceKeys, BobKeys, redeemScript, redeemScriptHash, getPubKey, getPubKeyHash, calculatePubKeyHash
};
