import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RotateCcw, 
  Trash2, 
  ShieldAlert, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  HardDrive,
  Info,
  ShieldCheck,
  Search,
  Activity
} from 'lucide-react';

interface BackupRecord {
  id: string;
  filename: string;
  timestamp: string;
  size: number;
  recordCount: number;
  note: string;
  status: string;
  encrypted: boolean;
  cipher: string;
}

interface BackupRecoveryProps {
  onRestoreSuccess: () => void;
}

export default function BackupRecovery({ onRestoreSuccess }: BackupRecoveryProps) {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Custom states
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info' | null; text: string }>({ type: null, text: '' });

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      } else {
        showAlert('error', 'Failed to retrieve backup history from the server.');
      }
    } catch (err) {
      showAlert('error', 'Could not establish connection to the backup service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const showAlert = (type: 'success' | 'error' | 'info', text: string) => {
    setAlert({ type, text });
    setTimeout(() => {
      setAlert({ type: null, text: '' });
    }, 6000);
  };

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackingUp(true);
    setAlert({ type: 'info', text: 'Encrypting database and writing restore point...' });
    
    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert('success', 'AES-256 Encrypted database backup created successfully!');
        setNote('');
        fetchBackups();
      } else {
        showAlert('error', data.message || 'Backup creation failed.');
      }
    } catch (err) {
      showAlert('error', 'Network error while attempting to run secure database serialization.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreBackup = async (id: string) => {
    setRestoringId(id);
    setConfirmRestoreId(null);
    setAlert({ type: 'info', text: 'Decrypting backup and restoring student database...' });

    try {
      const res = await fetch(`/api/backups/${id}/restore`, {
        method: 'POST'
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert('success', 'Database successfully decrypted and restored to this checkpoint!');
        // Trigger parent state update
        onRestoreSuccess();
      } else {
        showAlert('error', data.message || 'Failed to complete restore transaction.');
      }
    } catch (err) {
      showAlert('error', 'Error in communicating with backend recovery server.');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this backup file? This cannot be undone.')) {
      return;
    }
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/backups/${id}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert('success', 'Backup file successfully wiped from disk.');
        fetchBackups();
      } else {
        showAlert('error', data.message || 'Failed to delete backup file.');
      }
    } catch (err) {
      showAlert('error', 'Communication failure during file deletion.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredBackups = backups.filter(b => 
    b.note.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBackupSize = backups.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="space-y-6">
      
      {/* Alert Notification Display */}
      {alert.type && (
        <div 
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs font-semibold shadow-sm transition-all animate-in fade-in duration-300 ${
            alert.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : alert.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-indigo-50 border-indigo-100 text-indigo-800'
          }`}
        >
          {alert.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
          {alert.type === 'error' && <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />}
          {alert.type === 'info' && <RefreshCw className="h-5 w-5 text-indigo-600 animate-spin shrink-0" />}
          <div>
            <p className="font-bold">{alert.type === 'success' ? 'Transaction Success' : alert.type === 'error' ? 'Security / Database Alert' : 'System Processing'}</p>
            <p className="mt-0.5 opacity-90">{alert.text}</p>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Stats & Manual Trigger Area */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Security Status Panel */}
          <div className="bg-gradient-to-br from-[#0c2d59] to-[#051c3a] text-white p-5 rounded-2xl border border-[#13315c] shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="p-2.5 bg-[#1e3e6b] text-sky-300 rounded-xl">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase rounded-lg tracking-wider">
                AES-256 Enabled
              </span>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold tracking-wide uppercase text-slate-100">Encrypted Backups</h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                All ledger partitions (Students, Marks, Teachers, Timetables, and Safeguarding logs) are encrypted locally using custom Initialization Vectors (IV) before writing to disk.
              </p>
            </div>

            <div className="border-t border-[#13315c] pt-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Restore Points</span>
                <span className="text-lg font-extrabold text-white mt-0.5 block">{backups.length}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Disk Use</span>
                <span className="text-lg font-extrabold text-sky-300 mt-0.5 block">{formatBytes(totalBackupSize)}</span>
              </div>
            </div>
          </div>

          {/* Trigger Backup Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-[#0b2d59] tracking-wider flex items-center gap-1.5">
              <Database className="h-4 w-4" />
              <span>Trigger Manual Backup</span>
            </h3>
            
            <form onSubmit={handleCreateBackup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-500 block">Backup Description / Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Before student promotion to 2026 classes, or Term 1 End"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-24 resize-none bg-slate-50/50"
                  maxLength={180}
                  required
                />
                <span className="text-[9px] text-slate-400 block text-right">{note.length}/180 characters</span>
              </div>

              <button
                type="submit"
                disabled={backingUp}
                className="w-full py-2.5 px-4 bg-[#0b2d59] hover:bg-[#06182c] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
              >
                {backingUp ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Encrypting database...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Generate Encrypted Backup</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

        {/* Right Backup History Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col justify-between">
          
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-extrabold uppercase text-[#0b2d59] tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>Restore Points History</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Select a checkpoint below to rollback the entire system ledger.</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search backups..."
                className="w-full text-xs pl-8.5 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/55"
              />
            </div>
          </div>

          <div className="p-5 divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <RefreshCw className="h-8 w-8 text-[#0b2d59] animate-spin mb-2" />
                <span className="text-xs">Querying database backups from host storage...</span>
              </div>
            ) : filteredBackups.length === 0 ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                <HardDrive className="h-10 w-10 text-slate-300 mb-2" />
                <span className="text-xs font-bold">No restore points available</span>
                <p className="text-[10px] text-slate-400 max-w-xs mt-1">
                  Trigger a manual backup on the left to write an encrypted recovery checkpoint.
                </p>
              </div>
            ) : (
              filteredBackups.map((backup) => (
                <div key={backup.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-md">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[9px] font-bold rounded">
                        {backup.id}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {new Date(backup.timestamp).toLocaleString()}
                      </span>
                      {backup.encrypted && (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 text-[8px] font-bold rounded flex items-center gap-1">
                          <Lock className="h-2 w-2" />
                          <span>AES-256</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-extrabold text-slate-800 leading-snug">{backup.note}</p>
                    
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 text-indigo-600 font-bold">
                        <Activity className="h-3 w-3" />
                        <span>{backup.recordCount} records</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>File size: {formatBytes(backup.size)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setConfirmRestoreId(backup.id)}
                      disabled={restoringId !== null}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Rollback</span>
                    </button>
                    <button
                      onClick={() => handleDeleteBackup(backup.id)}
                      disabled={deletingId !== null}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Wipe backup file"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 leading-normal flex items-start gap-2.5">
            <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-600">Disaster Recovery Protocol</p>
              <p className="mt-0.5">
                Performing a rollback will completely overwrite students registry, grades records, schedules, and security logs with the data contained in the backup file. We highly recommend creating a checkpoint of the current system state before running any rollback operations.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Rollback Confirmation Modal */}
      {confirmRestoreId && (() => {
        const targetBackup = backups.find(b => b.id === confirmRestoreId);
        return (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-amber-600">
                <span className="p-2.5 bg-amber-50 rounded-xl">
                  <AlertTriangle className="h-6 w-6" />
                </span>
                <h3 className="text-sm font-extrabold text-slate-900">Confirm System Rollback?</h3>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                <p>
                  You are about to restore the system database to a previous checkpoint.
                </p>
                {targetBackup && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="font-bold text-slate-800">{targetBackup.note}</p>
                    <p className="text-[10px] text-slate-400">Created: {new Date(targetBackup.timestamp).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">Includes: {targetBackup.recordCount} students & records</p>
                  </div>
                )}
                <p className="text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100">
                  ⚠️ WARNING: This will permanently overwrite any student profiles, exam marks, and timetables added since this backup was generated!
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmRestoreId(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRestoreBackup(confirmRestoreId)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Execute Rollback</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
