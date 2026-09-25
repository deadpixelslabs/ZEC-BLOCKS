/* Shared native-ZEC listing policy; amounts never use floating-point arithmetic. */
(function(root){
  'use strict';
  const treasury='t1b9PCdoCncgoc13CWwWz8tzZZLDYfMaTyz',amount='0.0002',zatoshi=20000n;
  function authorization(asset,hash){
    if(!['ZEC_BLOCK','ZECS'].includes(asset)||! /^[0-9a-f]{64}$/.test(hash))throw Error('Invalid listing authorization.');
    return 'ZEC BLOCKS listing fee\nDomain: www.zecblocks.xyz\nNetwork: mainnet\nAsset: '+asset+'\nListing hash: '+hash+'\nTreasury: '+treasury+'\nListing fee: '+amount+' ZEC\nTrading protocol fee: 0%\nI authorize payment verification from my transparent address for this listing.';
  }
  function outputAmount(output){
    const value=output?.valueZat??output?.value_zat??output?.satoshis??output?.value;
    if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error('Invalid transaction amount.');
    if(!/^\d+$/.test(String(value??'')))throw Error('Transaction amount in zatoshi is unavailable.');
    return BigInt(value);
  }
  function transactionProof(tx,{txid,address,createdAt},requireConfirmed=true){
    if(tx?.txid!==txid||tx.isCanonical===false||tx.isCoinbase===true)throw Error('Listing fee transaction mismatch.');
    if(!Array.isArray(tx.outputs)||!Array.isArray(tx.inputs))throw Error('Listing fee transaction details unavailable.');
    const inputs=tx.inputs.filter(x=>(x.address||x.addr)===address);
    if(!inputs.length)throw Error('Listing fee must be funded from the authorized transparent address.');
    const paid=tx.outputs.filter(x=>(x.address||x.addr)===treasury).reduce((n,x)=>n+outputAmount(x),0n);
    if(paid!==zatoshi)throw Error('Listing fee must pay exactly 0.0002 ZEC to treasury.');
    const height=Number(tx.blockHeight),time=Number(tx.blockTime),confirmations=Number(tx.confirmations);
    if(!Number.isSafeInteger(height)||height<1||!Number.isSafeInteger(confirmations)||confirmations<1){
      if(requireConfirmed)throw Error('Listing fee is waiting for network confirmation.');
      return null;
    }
    if(tx.isCanonical!==true||tx.status!=='confirmed')throw Error('Listing fee is waiting for canonical confirmation.');
    if(!Number.isSafeInteger(time)||time<Math.floor(createdAt/1000)-180)throw Error('Listing fee predates this listing request.');
    return {height,time,confirmations};
  }
  const api={treasury,amount,zatoshi,authorization,transactionProof};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ListingFee=api;
})(globalThis);
