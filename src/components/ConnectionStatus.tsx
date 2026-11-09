import { useEffect, useState } from 'react';
export default function ConnectionStatus() {
  const [status,setStatus]=useState<'checking'|'online'|'offline'|'error'>('checking');
  const [checkedAt,setCheckedAt]=useState('');
  useEffect(()=>{
    let mounted=true;
    const check=async()=>{
      if(!navigator.onLine){setStatus('offline');return;}
      try{const response=await fetch('/api/health',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error();const data=await response.json();if(mounted){setStatus(data.ok?'online':'error');setCheckedAt(data.checkedAt||'');}}
      catch{if(mounted)setStatus(navigator.onLine?'error':'offline');}
    };
    check();const timer=setInterval(check,60000);window.addEventListener('online',check);window.addEventListener('offline',check);
    return()=>{mounted=false;clearInterval(timer);window.removeEventListener('online',check);window.removeEventListener('offline',check);};
  },[]);
  const time=checkedAt?new Date(checkedAt).toLocaleTimeString('en-UG',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Kampala'}):'';
  return <div role="status" title="Connection to the school database; no national EMIS connection is configured." className="text-xs text-slate-500"><span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${status==='online'?'bg-emerald-500':status==='checking'?'bg-slate-300':'bg-amber-500'}`}/>{status==='online'?'School database connected':status==='offline'?'Offline · drafts kept in this tab':status==='checking'?'Checking school database…':'School database unavailable'}{time&&<span className="ml-1">· last successful check {time}</span>}</div>;
}
