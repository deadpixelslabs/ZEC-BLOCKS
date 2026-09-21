const SUPABASE_URL='https://tvwvenyomlwvjtwxasca.supabase.co';
const SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2d3ZlbnlvbWx3dmp0d3hhc2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MjIwMTcsImV4cCI6MjEwNDE5ODAxN30.RLGs8yTBd0JyRdHlv63YzLHJ7t8qPNHqZWN3WRu00VY';

function noStore(res){
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma','no-cache');
  res.setHeader('Expires','0');
}
function cleanPath(v){
  if(Array.isArray(v))v=v.join('/');
  v=String(v||'').replace(/^\/+/, '');
  if(!(v.startsWith('rest/v1/')||v.startsWith('functions/v1/')))return '';
  if(v.includes('..'))return '';
  return v;
}
function buildQuery(query){
  const q=new URLSearchParams();
  for(const [k,v] of Object.entries(query||{})){
    if(k==='path'||v==null)continue;
    if(Array.isArray(v)){for(const x of v)q.append(k,String(x))}
    else q.set(k,String(v));
  }
  const s=q.toString();
  return s?'?'+s:'';
}
function bodyBytes(req){
  if(req.body==null)return undefined;
  if(typeof req.body==='string'||Buffer.isBuffer(req.body))return req.body;
  return JSON.stringify(req.body);
}

module.exports=async function handler(req,res){
  noStore(res);
  const path=cleanPath(req.query.path);
  if(!path)return res.status(400).json({ok:false,error:'Invalid canonical API path'});

  if(req.method==='OPTIONS'){
    res.setHeader('Allow','GET,POST,PATCH,DELETE,OPTIONS');
    return res.status(204).end();
  }
  if(!['GET','POST','PATCH','DELETE'].includes(req.method)){
    return res.status(405).json({ok:false,error:'Method not allowed'});
  }

  const url=SUPABASE_URL+'/'+path+buildQuery(req.query);
  const headers={
    'accept':String(req.headers.accept||'application/json'),
    'apikey':SUPABASE_ANON,
    'authorization':'Bearer '+SUPABASE_ANON
  };
  const ct=req.headers['content-type'];
  if(ct)headers['content-type']=String(ct);
  else if(req.method!=='GET')headers['content-type']='application/json';

  const ac=new AbortController();
  const timer=setTimeout(()=>ac.abort(),path.startsWith('functions/v1/')?50000:12000);
  try{
    const upstream=await fetch(url,{
      method:req.method,
      headers,
      body:req.method==='GET'?undefined:bodyBytes(req),
      signal:ac.signal
    });
    const buf=Buffer.from(await upstream.arrayBuffer());
    const type=upstream.headers.get('content-type');
    if(type)res.setHeader('Content-Type',type);
    res.setHeader('X-ZB1-Canonical-Proxy','1');
    return res.status(upstream.status).send(buf);
  }catch(e){
    const timeout=e?.name==='AbortError';
    return res.status(timeout?504:502).json({
      ok:false,error:timeout?'Canonical backend timeout':String(e?.message||e),retryable:true
    });
  }finally{clearTimeout(timer)}
};

