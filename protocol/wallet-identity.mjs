// Public data only. The wallet retains its seed and private signing keys.
export async function requestDerivedIdentity(provider,expected=null){
  const wallet=provider?.zcash||provider;
  const result=typeof wallet?.getPublicKey==='function'
    ?await wallet.getPublicKey({signingMode:'derived'})
    :await wallet.request({method:'zcash_getPublicKey',params:[{signingMode:'derived'}]});
  const publicKey=String(result?.pubkey||'').replace(/^0x/,'').toLowerCase();
  if(!/^(02|03)[0-9a-f]{64}$|^04[0-9a-f]{128}$/.test(publicKey))throw new Error('Wallet returned an unsupported derived public key');
  const bytes=Uint8Array.from(publicKey.match(/../g),x=>parseInt(x,16));
  const ownerCommitment=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const profile={schema:'zb1-identity-1',network:'mainnet',genesis:'ecf6fc3a79885f573d79de70a2de85c34667fc1a4fefe034d3a4015269379f0f',signingMode:'derived',publicKey,ownerCommitment};
  if(expected&&Object.keys(profile).some(k=>expected[k]!==profile[k]))throw new Error('Restored identity differs. Keep the saved profile and check the wallet account/derivation; do not replace ownership.');
  return profile;
}
