import { useEffect, useRef, useState } from 'react';

export type SaveState = 'saved'|'unsaved'|'saving'|'failed';
// Drafts contain record IDs and edited scores/statuses only. They stay in this
// browser tab, are scoped to the staff account and exact sheet, and expire.
export function readDraft<T>(key:string):{data:T;updatedAt:number}|null {
  try {
    const value=JSON.parse(sessionStorage.getItem(`rh-draft:${key}`)||'null');
    if(!value || Date.now()-value.updatedAt>24*60*60*1000){sessionStorage.removeItem(`rh-draft:${key}`);return null;}
    return value;
  }catch{return null;}
}
export function useDraft<T>(key:string) {
  const [state,setState]=useState<SaveState>('saved');
  const [notice,setNotice]=useState('');
  const latest=useRef<T|undefined>(undefined);
  const currentKey=useRef(key);
  currentKey.current=key;
  const store=(data:T)=>{
    latest.current=data;setState('unsaved');setNotice('');
    try{sessionStorage.setItem(`rh-draft:${key}`,JSON.stringify({data,updatedAt:Date.now()}));}
    catch{setNotice('This browser could not preserve a draft. Keep this page open until the server confirms the save.');}
  };
  const saved=()=>{try{sessionStorage.removeItem(`rh-draft:${key}`);}catch{} latest.current=undefined;setState('saved');setNotice('');};
  const restore=()=>{const draft=readDraft<T>(key);setState(draft?'unsaved':'saved');setNotice(draft?'A draft from this browser tab was restored. Review it and press Save.':'');return draft?.data;};
  useEffect(()=>{
    const prevent=(event:BeforeUnloadEvent)=>{if(readDraft(currentKey.current)){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);
  },[]);
  return {state,setState,notice,store,saved,restore};
}
