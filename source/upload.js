(function(root){
'use strict';
const active=new WeakSet();
async function send(session,files,options={}){
 if(active.has(session))return {busy:true};
 if(session.run_mode==='demo'||!session.dataPipeExperimentId)return {skipped:true};
 active.add(session);
 const request=options.fetch||fetch,changed=options.onProgress||(()=>{});
 try{
  session.upload_files=session.upload_files||{};
  for(const f of files)if(session.upload_files[f.key]?.filename!==f.filename)session.upload_files[f.key]={filename:f.filename,status:'not_attempted'};
  session.upload_status='sending';changed();
  for(const file of files){
   const state=session.upload_files[file.key];
   if(['saved','queued','needs_verify'].includes(state.status))continue;
   state.status='sending';delete state.error;changed();
   let definiteRejection=false;
   try{
    const response=await request('https://pipe.jspsych.org/api/'+(file.encoding==='base64'?'base64':'data')+'/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({experimentID:session.dataPipeExperimentId,filename:file.filename,data:file.data}),signal:AbortSignal.timeout(30000)});
    const body=await response.json();
    if(response.status===201&&!body.error)state.status='saved';
    else if(response.status===202&&!body.error)state.status='queued';
    else if(body.error==='FILE_EXISTS'){state.status='needs_verify';state.error='FILE_EXISTS';}
    else {definiteRejection=true;throw Error(body.error||'HTTP_'+response.status);}
   }catch(error){state.status=definiteRejection?'failed':'uncertain';state.error=String(error.message||error);changed();break;}
   changed();
  }
  const states=files.map(f=>session.upload_files[f.key]),unconfirmed=states.some(s=>!['saved','queued'].includes(s.status));
  session.upload_status=unconfirmed?'uncertain':states.some(s=>s.status==='queued')?'queued':'saved';
  session.upload_error=states.filter(s=>s.error).map(s=>s.error).join(', ')||null;changed();
  return {status:session.upload_status,files:session.upload_files};
 }finally{active.delete(session);}
}
const api={send};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BatteryUpload=api;
})(typeof globalThis!=='undefined'?globalThis:this);

