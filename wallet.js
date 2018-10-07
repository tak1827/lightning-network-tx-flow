const CryptoJS = require('crypto-js');
const Elliptic = require('elliptic').ec;
const EC = new Elliptic('secp256k1');

// console.log("'" + generatePrivateKey() + "',")

// Private keys of Alice
const AliceKeys = [
  '6374bba8dee5463e921785c74818ff00f9f6155151b99465715486f4916784b0',
  'c0a841874a243335b339a671e6df2bcc76ce038d43515425c7e7eda20e93ba4',
  'a5afe9a23b495b4b8e8abd8bb451a91407b746f5e8116cc4ff478d4dac81b182',
  'd799c8743ac88c17fc290bfcd4865914665c2b591757de43b5774405f013a92a',
  '640819c07625cfa9ff32b5b5bb5170f2ee419c10e34ab69b9dedb435cccbbf6e',
  '288ebe35c3487f7f25d97e447a45d49dc4db3445c0029b7a9fe4ff7a592cadbf',
	'2ff44926be4cc3175e3592a63ed18fe3f79c0cfa61835e377ae13e3aff0a6bfc',
	'2291cddf3467f495bcad0b63b4973b2a2793b2eea049a7d6c46d3bdbf2692f22',
	'599971e2d320ba7de709f1503ed87ebeb120d65fc73296e51f420476ddad6d72'
]

// Private keys of Bob
const BobKeys = [
  '991721b2b620087fd5006fe9c6855354bc965771f0f1b4f62afc77483f191202',
  '7f1b27a5f468327c6bc33d50f0fa60aac9bddf547fa8978d6021695ef785277',
  '36803c2b67e72a47113f80bd2bc9bdb4370f45850acce00a0d45ae8ffc2f1529',
  '21ce41ef2389dd68281d55c3786f6ed5d94bedc549f159f019ca12aeaeda879b',
  '5ebed1145f9288265ef8448e4f7ddbcb9165153b92a2061fc974cccb7833bec8',
  'dc1f377238591dc4ddcbf32e0bc98d9e594a191bf38f58dc7c2a41001d4d4684',
	'e134a77d98ab27977982647117106a62f077af1bb33c25ea78ff32bc7f100898',
	'43ab7c132df7eb988ceaabd9ecdcaec03d5f289abf6744aa115004d3c255c227',
	'3b4e895969ebbfc3d391ad4651cbd34872c6b2395d496a6c51231e5b442237cb'
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
	AliceKeys, BobKeys, redeemScript, redeemScriptHash, getPubKey, getPubKeyHash, calculatePubKeyHash, generatePrivateKey
};
