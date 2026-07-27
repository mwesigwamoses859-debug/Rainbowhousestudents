import { 
  Home, 
  Users, 
  GraduationCap, 
  Calendar, 
  FileSpreadsheet, 
  HeartHandshake, 
  Settings,
  LogOut,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Teacher } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  teacher: Teacher;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, teacher, onLogout }: SidebarProps) {
  
  // Compact list mapping perfectly to exact labels and icons
  const adminItems = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'classes', name: 'Students', icon: Users },
    { id: 'subjects', name: 'Subject Portals', icon: BookOpen },
    { id: 'marks', name: 'Academics', icon: GraduationCap },
    { id: 'attendance', name: 'Attendance', icon: Calendar },
    { id: 'reports', name: 'Examinations', icon: FileSpreadsheet },
    { id: 'ai-chat', name: 'AI Assistant', icon: Sparkles },
    { id: 'operations', name: 'School Controls', icon: Settings },
    { id: 'upload', name: 'Settings', icon: Settings },
  ];
  const teacherItems = [
    { id: 'dashboard', name: 'My Desk', icon: Home },
    { id: 'marks', name: 'My Mark Sheet', icon: GraduationCap },
    { id: 'attendance', name: 'My Attendance', icon: Calendar },
  ];
  const sidebarItems = teacher.role === 'Headteacher' || teacher.role === 'DOS' ? adminItems : teacherItems;

  return (
    <aside id="app_sidebar" className="hidden md:flex w-64 bg-[#06182c] text-[#a5b4fc] min-h-[calc(100vh-70px)] flex-col justify-between shrink-0 shadow-xl no-print select-none border-r border-[#0f243c]">
      
      {/* Navigation Menu */}
      <div className="py-4">
        <nav className="space-y-0.5">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            
            // Highlight logic
            const isActive = activeTab === item.id || 
              (item.id === 'classes' && activeTab === 'upload') ||
              (item.id === 'marks' && activeTab === 'timetable') ||
              (item.id === 'reports' && (activeTab === 'graduation' || activeTab === 'idcards'));

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-6 py-3.5 text-xs font-semibold tracking-wider uppercase transition-all duration-150 text-left cursor-pointer border-l-4 ${
                  isActive
                    ? 'border-[#FF5E4D] bg-[#0c223a] text-white font-bold'
                    : 'border-transparent text-slate-400 hover:bg-[#0c223a]/50 hover:text-white'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-[#FF5E4D]' : 'text-slate-400 group-hover:text-white'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Ministry Sync Panel & Session Details */}
      <div className="p-4 space-y-4 border-t border-[#0f243c]/80 bg-[#051424]">
        
        {/* Ministry Ready Status */}
        <div className="p-3 bg-[#0a1f35] rounded-xl flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">EMIS Sync</span>
            <span className="text-[10px] font-bold text-emerald-400 block flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Ready
            </span>
          </div>
          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
        </div>

        {/* User profile short info */}
        <div className="flex items-center justify-between gap-2">
          <div className="truncate">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Instructor</p>
            <p className="text-xs font-bold text-slate-300 truncate">{teacher.name}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-2 bg-[#0a1f35] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

      </div>
      
    </aside>
  );
}
