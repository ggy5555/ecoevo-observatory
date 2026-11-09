import {runExperiment} from "../experiments/runner.js";
let active=null;
self.onmessage=async event=>{
  const msg=event.data;
  if(msg.type==="CANCEL") {
    if(active?.jobId===msg.jobId) active.cancelled=true;
    return;
  }
  if(msg.type!=="START")return;
  if(active){self.postMessage({type:"ERROR",jobId:msg.jobId,code:"BUSY",message:"실행 중인 실험을 먼저 취소하세요."});return;}
  const job={jobId:msg.jobId,cancelled:false};
  active=job;
  try{
    const result=await runExperiment(msg.plan,{
      shouldCancel:()=>job.cancelled,
      onProgress:progress=>self.postMessage({type:"PROGRESS",jobId:job.jobId,...progress})
    });
    self.postMessage({type:result.status==="cancelled"?"CANCELLED":"RESULT",jobId:job.jobId,result});
  }catch(error){
    self.postMessage({type:"ERROR",jobId:job.jobId,code:"EXPERIMENT_ERROR",message:String(error?.message||error)});
  }finally{
    if(active===job)active=null;
  }
};
