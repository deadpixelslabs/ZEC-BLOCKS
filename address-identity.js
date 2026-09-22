/* Public, wallet-signed address bindings. No seeds or private keys. */
(function(root){
  'use strict';
  function createTools(E){
    const clean=value=>String(value||'').replace(/^0x/i,'').toLowerCase();
    function publicKey(value){
      const key=clean(value);
      if(!/^(?:02|03)[0-9a-f]{64}$|^04[0-9a-f]{128}$/.test(key))throw Error('Invalid wallet public key.');
      E.SigningKey.computePublicKey('0x'+key,true);return key;
    }
    function addressFor(key){
      const hash=E.ripemd160(E.sha256(E.SigningKey.computePublicKey('0x'+publicKey(key),true)));
      const payload=E.concat(['0x1cb8',hash]);
      return E.encodeBase58(E.concat([payload,E.dataSlice(E.sha256(E.sha256(payload)),0,4)]));
    }
    function validateAddress(address){
      if(!/^t1[1-9A-HJ-NP-Za-km-z]{33}$/.test(address))throw Error('Enter a Zcash mainnet transparent address (t1…).');
      const bytes=E.toBeHex(E.decodeBase58(address),26),payload=E.dataSlice(bytes,0,22);
      if(!payload.startsWith('0x1cb8')||E.dataSlice(bytes,22)!==E.dataSlice(E.sha256(E.sha256(payload)),0,4))throw Error('The address checksum is invalid. Check the recipient address.');
      return address;
    }
    function identity(proof,genesis){
      if(proof?.v!==1||proof.network!=='mainnet'||proof.genesis!==genesis||!/^[0-9a-f]{64}$/.test(genesis))throw Error('Address proof belongs to another network or collection.');
      const address=validateAddress(proof.address),addressPubkey=publicKey(proof.addressPubkey),nftPubkey=publicKey(proof.nftPubkey);
      const owner=E.sha256('0x'+nftPubkey).slice(2);
      if(owner!==proof.owner||addressFor(addressPubkey)!==address)throw Error('Address proof does not match the receiving wallet.');
      return {v:1,network:'mainnet',genesis,address,owner,addressPubkey,nftPubkey};
    }
    function message(proof,genesis){
      const p=identity(proof,genesis);
      return `ZEC BLOCKS NFT receiving address\nDomain: www.zecblocks.xyz\nNetwork: mainnet\nCollection: ${p.genesis}\nAddress: ${p.address}\nNFT owner: ${p.owner}\nAddress key: ${p.addressPubkey}\nNFT key: ${p.nftPubkey}\nI authorize this public, permanent address-to-NFT identity link. This does not transfer assets.`;
    }
    function digest(message){
      const compact=n=>n<253?E.toBeHex(n,1):E.concat(['0xfd',E.toBeHex(n&255,1),E.toBeHex(n>>8,1)]);
      const prefix=E.toUtf8Bytes('Zcash Signed Message:\n'),bytes=E.toUtf8Bytes(message);
      if(bytes.length>65535)throw Error('Message too long.');
      return E.sha256(E.sha256(E.concat([compact(prefix.length),prefix,compact(bytes.length),bytes])));
    }
    function verifySignature(msg,signature,key){
      const s=clean(signature);if(!/^[0-9a-f]{130}$/.test(s))throw Error('Missing wallet signature.');
      const header=parseInt(s.slice(0,2),16),rec=header>=31?header-31:header-27;
      if(header<27||header>34||rec>1)throw Error('Unsupported wallet signature header.');
      const order=0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
      let n=BigInt('0x'+s.slice(66)),parity=rec;
      if(n<=0n||n>=order)throw Error('Invalid wallet signature.');
      if(n>order/2n){n=order-n;parity^=1}
      const recovered=E.SigningKey.recoverPublicKey(digest(msg),{r:'0x'+s.slice(2,66),s:E.toBeHex(n,32),v:27+parity});
      if(E.SigningKey.computePublicKey(recovered,true)!==E.SigningKey.computePublicKey('0x'+publicKey(key),true))throw Error('Wallet signature does not match the receiving address.');
    }
    function verify(proof,genesis){
      const p=identity(proof,genesis),msg=message(p,genesis);
      verifySignature(msg,proof.addressSignature,p.addressPubkey);
      verifySignature(msg,proof.nftSignature,p.nftPubkey);
      return {...p,addressSignature:clean(proof.addressSignature),nftSignature:clean(proof.nftSignature)};
    }
    return {addressFor,validateAddress,identity,message,digest,verify};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=createTools;
  else root.NftAddressTools=createTools;
})(globalThis);
