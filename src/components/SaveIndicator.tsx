import { SaveState } from '../lib/drafts';
export default function SaveIndicator({state,notice}:{state:SaveState;notice?:string}) {
  const messages={saved:'Saved',unsaved:'Unsaved · draft kept in this tab',saving:'Saving…',failed:'Failed · draft retained; retry Save'};
  return <div role="status" aria-live="polite" className={`rounded-lg border px-3 py-2 text-sm ${state==='failed'?'border-red-200 bg-red-50 text-red-800':state==='saved'?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-amber-200 bg-amber-50 text-amber-900'}`}>{messages[state]}{notice&&<p className="mt-1 text-xs">{notice}</p>}</div>;
}
