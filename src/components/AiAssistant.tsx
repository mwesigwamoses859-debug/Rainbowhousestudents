import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Trash2, 
  Sparkles, 
  Brain, 
  HeartHandshake, 
  User, 
  GraduationCap, 
  Cpu, 
  Plus, 
  MessageSquare,
  ClipboardList
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion } from 'motion/react';
import AshinagaLogo from './AshinagaLogo';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am your **Ashinaga Uganda Rainbow House AI Assistant**. I have real-time access to our student registry, academics ledger, support plans, and community home visit records.\n\nChoose a role or persona from the settings above, and ask me any question about our students, academic performance, social support, or administrative planning!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'academic' | 'social' | 'admin'>('academic');
  const [model, setModel] = useState<string>('gemini-3.5-flash');
  
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || loading) return;

    if (!textToSend) setInput('');

    const updatedMessages: Message[] = [...messages, { role: 'user', content: query }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          role,
          model
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `⚠️ **Error**: ${data.message || "I encountered an issue generating a response."}` 
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⚠️ **Network Error**: Failed to communicate with the AI agent. Please check your connections.` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Chat history cleared. I am now acting as your **${
          role === 'academic' ? 'Academic Advisor' : role === 'social' ? 'Community Social Worker' : 'Lead Administrator'
        }**. Ask me anything!`
      }
    ]);
  };

  const handleRoleChange = (newRole: 'academic' | 'social' | 'admin') => {
    setRole(newRole);
    setMessages([
      {
        role: 'assistant',
        content: `I've switched roles! I am now acting as your **${
          newRole === 'academic' 
            ? 'Senior Academic Advisor' 
            : newRole === 'social' 
              ? 'Community Social Worker' 
              : 'Lead School Administrator'
        }**.\n\nHow can I support your work at the Rainbow House today?`
      }
    ]);
  };

  // Predefined prompts for each role
  const quickPrompts = {
    academic: [
      { label: "Analyze Math Scores", text: "Which students are currently performing below 60% in Mathematics?" },
      { label: "Draft report comment", text: "Draft an encouraging report card comment for Kato Julius (st-3) based on his academic standing." },
      { label: "Remedial Plan", text: "Propose a 4-week remedial tutoring plan for student Babirye Sarah." }
    ],
    social: [
      { label: "Home visit prep", text: "Suggest a checklist to prepare for a household visit in Gganda zone." },
      { label: "Scholarship criteria", text: "Based on our current scholarship database, suggest what vulnerability criteria we should prioritize for the next intake." },
      { label: "Absenteeism response", text: "What support interventions are currently active for our students, and what should we add for students with high absenteeism?" }
    ],
    admin: [
      { label: "Draft Parent Letter", text: "Draft a parent circular announcing the dates of the upcoming Term 2 end assessments." },
      { label: "Class Timetable", text: "Create a draft daily class schedule for P.6 class with 5 core subjects." },
      { label: "Class project ideas", text: "Suggest some hands-on science project ideas for Primary Seven (P.7) students." }
    ]
  };

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 no-print">
        <div className="flex items-center gap-3">
          <AshinagaLogo size={50} className="shrink-0 bg-white p-1 rounded-xl shadow-xs border border-slate-100" />
          <div>
            <h2 className="text-xl font-black text-[#032b5e] uppercase tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
              Gemini Copilot Hub
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Analyze grades, draft circulars, plan social home visits, and coordinate community interventions using Gemini-grounded models.
            </p>
          </div>
        </div>
      </div>

      {/* Control Panel / Configuration */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-5 items-center no-print">
        {/* Role Select */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Assistant Persona Role</label>
          <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
            <button
              onClick={() => handleRoleChange('academic')}
              className={`py-2 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                role === 'academic'
                  ? 'bg-[#032b5e] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Academic</span>
            </button>
            <button
              onClick={() => handleRoleChange('social')}
              className={`py-2 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                role === 'social'
                  ? 'bg-[#032b5e] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <HeartHandshake className="h-3.5 w-3.5" />
              <span>Social Worker</span>
            </button>
            <button
              onClick={() => handleRoleChange('admin')}
              className={`py-2 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                role === 'admin'
                  ? 'bg-[#032b5e] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Model Select */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Gemini Engine Node</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#032b5e]/10 cursor-pointer"
          >
            <option value="gemini-3.5-flash">Gemini 3.5 Flash (General Chat & Advice)</option>
            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Complex Diagnostic Reasoning)</option>
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fast responses)</option>
          </select>
        </div>

        {/* Info or Clear */}
        <div className="flex justify-end gap-3 self-end pt-2 md:pt-0">
          <button
            onClick={clearChat}
            className="px-4 py-2.5 bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 text-slate-600 hover:text-rose-600 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[520px] overflow-hidden">
        {/* Messages list */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                key={index}
                className={`flex gap-3 max-w-[80%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  isUser 
                    ? 'bg-[#FF5E4D] text-white' 
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                }`}>
                  {isUser ? <User className="h-4 w-4" /> : <Brain className="h-4 w-4 text-indigo-600" />}
                </div>

                {/* Message body */}
                <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                  isUser 
                    ? 'bg-[#FF5E4D] text-white border-[#FF5E4D] rounded-tr-none' 
                    : 'bg-white text-slate-800 border-slate-100 rounded-tl-none shadow-sm'
                }`}>
                  <div className="markdown-body font-semibold">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {loading && (
            <div className="flex gap-3 max-w-[80%] mr-auto">
              <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm animate-bounce">
                <Cpu className="h-4 w-4 text-indigo-600 animate-spin" />
              </div>
              <div className="bg-white text-slate-500 border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm text-xs font-bold flex items-center gap-2">
                <span>Analyzing Rainbow House dataset...</span>
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-75" />
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse delay-150" />
                </span>
              </div>
            </div>
          )}
          <div ref={threadEndRef} />
        </div>

        {/* Quick action prompts */}
        <div className="px-6 py-3 bg-slate-50 border-t border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-print scrollbar-none">
          <span className="text-[9px] font-black uppercase text-slate-400 shrink-0">Quick Queries:</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {quickPrompts[role].map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p.text)}
                disabled={loading}
                className="px-3 py-1.5 bg-white hover:bg-[#032b5e] border border-slate-200 hover:border-[#032b5e] text-slate-600 hover:text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input box */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 no-print">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            disabled={loading}
            placeholder={`Ask our ${role === 'academic' ? 'Academic Advisor' : role === 'social' ? 'Community Social Worker' : 'Lead Administrator'} a question...`}
            className="flex-1 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#032b5e]/10 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-3 bg-[#032b5e] hover:bg-[#FF5E4D] text-white rounded-2xl transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:bg-slate-300"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
