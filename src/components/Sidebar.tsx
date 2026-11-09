import { Home, Users, GraduationCap, Calendar, FileSpreadsheet, Settings, LogOut, Sparkles, BookOpen, X, HeartHandshake } from 'lucide-react';
import { Teacher } from '../types';
interface Props {activeTab:string;setActiveTab:(tab:string)=>void;teacher:Teacher;onLogout:()=>void;open?:boolean;onClose?:()=>void;}
export default function Sidebar({activeTab,setActiveTab,teacher,onLogout,open,onClose}:Props) {
  const isAdmin=teacher.role==='Headteacher'||teacher.role==='DOS'||teacher.username==='admin';
  const items=[
    {id:'dashboard',name:isAdmin?'Dashboard':'My dashboard',icon:Home},
    {id:'classes',name:'Pupils',icon:Users},
    {id:'careprogram',name:'Care Program',icon:HeartHandshake},
    ...(isAdmin?[{id:'subjects',name:'Subject workspaces',icon:BookOpen}]:[]),
    {id:'marks',name:'Academics',icon:GraduationCap},
    {id:'attendance',name:'Attendance',icon:Calendar},
    {id:'reports',name:'Reports & Documents',icon:FileSpreadsheet},
    ...(isAdmin?[{id:'operations',name:'School controls',icon:Settings},{id:'upload',name:'Backup & Settings',icon:Settings},{id:'ai-chat',name:'AI assistant',icon:Sparkles}]:[])
  ];
  return <>{open&&<button aria-label="Close navigation overlay" className="fixed inset-0 z-40 bg-slate-950/40 md:hidden" onClick={onClose}/>}<aside id="app_sidebar" className={`${open?'flex':'hidden'} fixed inset-y-0 left-0 z-50 w-60 shrink-0 flex-col border-r border-[#183650] bg-[#071c32] text-slate-300 md:sticky md:top-0 md:z-20 md:flex md:h-screen no-print`}>
    <div className="flex items-center justify-between px-5 pb-3 pt-6 text-xs font-semibold tracking-wider text-slate-400">RAINBOW HOUSE<button aria-label="Close navigation" onClick={onClose} className="p-2 md:hidden"><X size={18}/></button></div>
    <nav aria-label="Main navigation" className="space-y-1 px-3 py-2">{items.map(item=><button key={item.id} aria-current={activeTab===item.id?'page':undefined} onClick={()=>{setActiveTab(item.id);onClose?.();}} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors ${activeTab===item.id?'bg-[#173b5b] font-semibold text-white':'hover:bg-[#112e49] hover:text-white'}`}><item.icon size={18} className={activeTab===item.id?'text-sky-300':'text-slate-400'}/>{item.name}</button>)}</nav>
    <div className="mt-auto space-y-4 border-t border-[#183650] p-5"><div className="text-xs leading-relaxed text-slate-400">School records workspace<br/><span className="text-slate-500">National EMIS: not connected</span></div><div className="text-sm font-medium text-slate-100">{teacher.name}<p className="mt-1 text-xs font-normal text-slate-400">{teacher.role}</p></div><button onClick={onLogout} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"><LogOut size={16}/>Sign out</button></div>
  </aside></>;
}
