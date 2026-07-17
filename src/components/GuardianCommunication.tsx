import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  MessageSquare, 
  Calendar, 
  Send, 
  Users, 
  Check, 
  AlertCircle, 
  Clock, 
  Plus, 
  X,
  Sparkles,
  Smartphone,
  BellRing,
  BellOff,
  History,
  CheckCircle2,
  ShieldAlert,
  Radio,
  Tv,
  Zap,
  Terminal,
  Sliders,
  UserCheck,
  RefreshCw,
  Play,
  CheckSquare,
  Square
} from 'lucide-react';
import { Student, ClassName } from '../types';
import { 
  isPushSupported, 
  getActiveSubscription, 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications 
} from '../pushService';

interface InteractionLog {
  id: string;
  studentId: string;
  date: string;
  type: 'Phone Call' | 'In-Person Meeting' | 'SMS Alert' | 'Home Visit Follow-up';
  guardianName: string;
  summary: string;
  actionRequired: string;
  loggedBy: string;
}

interface SMSLog {
  id: string;
  studentId: string;
  guardianName: string;
  phoneNumber: string;
  messageBody: string;
  status: 'Delivered' | 'Failed' | 'Sending';
  dateSent: string;
}

interface GuardianCommunicationProps {
  students: Student[];
}

export default function GuardianCommunication({ students }: GuardianCommunicationProps) {
  const [selectedClass, setSelectedClass] = useState<ClassName>('P.1');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [subTab, setSubTab] = useState<'interactions' | 'sms' | 'push'>('interactions');

  const [interactions, setInteractions] = useState<InteractionLog[]>([]);
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);

  // Gateway status from server
  const [gatewayStatus, setGatewayStatus] = useState<{
    activeGateway: string;
    hasAT: boolean;
    hasTwilio: boolean;
    atUsername: string | null;
    twilioFrom: string | null;
  }>({
    activeGateway: 'Loading status...',
    hasAT: false,
    hasTwilio: false,
    atUsername: null,
    twilioFrom: null
  });

  // Automated SMS Campaign States
  const [attendance, setAttendance] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [campaignType, setCampaignType] = useState<'absence' | 'report'>('absence');
  const [campaignDate, setCampaignDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [campaignTerm, setCampaignTerm] = useState<1 | 2 | 3>(1);
  const [campaignYear, setCampaignYear] = useState<number>(2026);
  const [campaignClass, setCampaignClass] = useState<ClassName | 'All'>('All');
  
  const [preparedCampaignAlerts, setPreparedCampaignAlerts] = useState<any[]>([]);
  const [selectedCampaignAlertIds, setSelectedCampaignAlertIds] = useState<string[]>([]);
  const [campaignDispatching, setCampaignDispatching] = useState<boolean>(false);
  const [campaignDispatchProgress, setCampaignDispatchProgress] = useState<number>(0);
  const [campaignDispatchStatusText, setCampaignDispatchStatusText] = useState<string>('');
  
  // Terminal logs state
  const [gatewayLogs, setGatewayLogs] = useState<string[]>(() => [
    `[${new Date().toLocaleTimeString()}] Gateway initialized on Nansana Telecom Node.`,
    `[${new Date().toLocaleTimeString()}] Credits remaining: ${(localStorage.getItem('sms_credits_balance') ? parseInt(localStorage.getItem('sms_credits_balance')!) : 4820).toLocaleString()} units.`
  ]);
  const [smsCredits, setSmsCredits] = useState<number>(() => {
    const saved = localStorage.getItem('sms_credits_balance');
    return saved ? parseInt(saved) : 4820;
  });

  // Push Subsystem States
  const [teacher, setTeacher] = useState<any>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSubscriptionsList, setPushSubscriptionsList] = useState<any[]>([]);
  const [pushHistoryList, setPushHistoryList] = useState<any[]>([]);
  
  // Push Composer States
  const [pushTemplate, setPushTemplate] = useState<'safeguarding-urgent' | 'mark-reminder' | 'custom'>('safeguarding-urgent');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushTargetUrl, setPushTargetUrl] = useState('/cases');
  const [pushSuccessMessage, setPushSuccessMessage] = useState('');
  const [pushErrorMessage, setPushErrorMessage] = useState('');

  // Modals
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);

  // New Interaction state
  const [interType, setInterType] = useState<'Phone Call' | 'In-Person Meeting' | 'SMS Alert' | 'Home Visit Follow-up'>('Phone Call');
  const [interSummary, setInterSummary] = useState('');
  const [interAction, setInterAction] = useState('');
  const [interLoggedBy, setInterLoggedBy] = useState('Primary Class Teacher');

  // New SMS state
  const [smsTemplate, setSmsTemplate] = useState<string>('attendance');
  const [smsCustomBody, setSmsCustomBody] = useState('');
  const [smsStatusAlert, setSmsStatusAlert] = useState(false);

  const classesList: ClassName[] = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];
  const filteredStudents = students.filter(s => s.className === selectedClass);

  useEffect(() => {
    if (filteredStudents.length > 0) {
      setSelectedStudentId(filteredStudents[0].id);
    } else {
      setSelectedStudentId('');
    }
  }, [selectedClass]);

  // Load from API on mount
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const [intRes, smsRes, attRes, marksRes, gwRes] = await Promise.all([
          fetch('/api/interactions'),
          fetch('/api/sms'),
          fetch('/api/attendance'),
          fetch('/api/marks'),
          fetch('/api/sms/gateway-status')
        ]);
        if (intRes.ok && smsRes.ok) {
          const intData = await intRes.json();
          const smsData = await smsRes.json();
          setInteractions(intData);
          setSmsLogs(smsData);
        }
        if (attRes && attRes.ok) {
          const attData = await attRes.json();
          setAttendance(attData);
        }
        if (marksRes && marksRes.ok) {
          const marksData = await marksRes.json();
          setMarks(marksData);
        }
        if (gwRes && gwRes.ok) {
          const gwData = await gwRes.json();
          setGatewayStatus(gwData);
          if (gwData.activeGateway !== 'Sandbox Simulator') {
            setGatewayLogs(prev => [
              `[${new Date().toLocaleTimeString()}] Live Node Activated: ${gwData.activeGateway}. Ready for live transmission!`,
              ...prev
            ]);
          }
        }
      } catch (err) {
        console.log('Error loading communication logs');
      }
    };
    fetchLogs();
  }, []);

  // Load current instructor & Push configurations on mount
  useEffect(() => {
    const saved = localStorage.getItem('school_sms_teacher');
    if (saved) {
      try {
        setTeacher(JSON.parse(saved));
      } catch (e) {}
    }

    const supported = isPushSupported();
    setPushSupported(supported);

    if (supported) {
      getActiveSubscription().then(sub => {
        setPushSubscribed(!!sub);
      });
      fetchPushData();
    }
  }, []);

  const fetchPushData = async () => {
    try {
      const [subRes, histRes] = await Promise.all([
        fetch('/api/push/subscriptions'),
        fetch('/api/push/history')
      ]);
      if (subRes.ok && histRes.ok) {
        const subData = await subRes.json();
        const histData = await histRes.json();
        setPushSubscriptionsList(subData.subscriptions || []);
        setPushHistoryList(histData.alerts || []);
      }
    } catch (err) {
      console.error('Error fetching push node data', err);
    }
  };

  // Prefill Push Template contents
  useEffect(() => {
    if (pushTemplate === 'safeguarding-urgent') {
      setPushTitle('⚠️ URGENT SAFEGUARDING ALERT');
      setPushBody('A high-priority pupil protection event has been filed. Please review the Safeguarding Case Ledger immediately in Nansana Community Hub.');
      setPushTargetUrl('/cases');
    } else if (pushTemplate === 'mark-reminder') {
      setPushTitle('📝 Academic Mark Entry Reminder');
      setPushBody('All subject instructors are reminded that candidate Term 1 assessment marks are past due. Please complete and submit outstanding report sheets.');
      setPushTargetUrl('/marks');
    } else {
      setPushTitle('📢 System-Wide Teacher Alert');
      setPushBody('');
      setPushTargetUrl('/');
    }
  }, [pushTemplate]);

  const handleSubscribe = async () => {
    setPushLoading(true);
    setPushErrorMessage('');
    setPushSuccessMessage('');
    try {
      const username = teacher?.username || 'teacher_user';
      const sub = await subscribeToPushNotifications(username);
      if (sub) {
        setPushSubscribed(true);
        setPushSuccessMessage('Successfully registered this device to the National EMIS Node push subsystem! Urgent alerts will now be received.');
        fetchPushData();
      }
    } catch (error: any) {
      setPushErrorMessage(error.message || 'Failed to enroll device in Push network.');
    } finally {
      setPushLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setPushLoading(true);
    setPushErrorMessage('');
    setPushSuccessMessage('');
    try {
      const unsubscribed = await unsubscribeFromPushNotifications();
      if (unsubscribed) {
        setPushSubscribed(false);
        setPushSuccessMessage('Successfully disabled Push alerts on this device. You will no longer receive background alerts here.');
        fetchPushData();
      } else {
        setPushErrorMessage('Device was not subscribed.');
      }
    } catch (error: any) {
      setPushErrorMessage(error.message || 'Failed to remove push subscription.');
    } finally {
      setPushLoading(false);
    }
  };

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle || !pushBody) return;
    setPushLoading(true);
    setPushErrorMessage('');
    setPushSuccessMessage('');
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pushTitle,
          body: pushBody,
          tag: pushTemplate,
          clickAction: pushTargetUrl
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPushSuccessMessage(`Push broadcast successfully dispatched! Delivered to ${data.sentCount} devices (${data.failedCount} failed/inactive).`);
        setPushTitle('');
        setPushBody('');
        fetchPushData();
      } else {
        const data = await res.json();
        setPushErrorMessage(data.message || 'Failed to dispatch push notification.');
      }
    } catch (error: any) {
      setPushErrorMessage('Error connecting to the Push server.');
    } finally {
      setPushLoading(false);
    }
  };

  const activeStudent = students.find(s => s.id === selectedStudentId);

  // Pre-fill custom SMS body based on template
  useEffect(() => {
    if (!activeStudent) return;
    const guardian = activeStudent.guardianName || 'Guardian';
    const studentName = `${activeStudent.surname} ${activeStudent.otherNames}`;

    if (smsTemplate === 'attendance') {
      setSmsCustomBody(`Dear ${guardian}, your child ${studentName} was marked ABSENT today from Nansana School. Please contact the class teacher.`);
    } else if (smsTemplate === 'performance') {
      setSmsCustomBody(`Dear ${guardian}, Term 1 assessment marks for ${studentName} have been compiled. Please attend the report card distribution meeting.`);
    } else if (smsTemplate === 'fees') {
      setSmsCustomBody(`Dear ${guardian}, this is a reminder regarding the term sponsorship renewal / lunch program fees for ${studentName}. Thank you.`);
    } else {
      setSmsCustomBody('');
    }
  }, [smsTemplate, selectedStudentId]);

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    const payload = {
      studentId: selectedStudentId,
      date: new Date().toISOString().split('T')[0],
      type: interType,
      guardianName: student.guardianName || 'Parent / Guardian',
      summary: interSummary,
      actionRequired: interAction,
      loggedBy: interLoggedBy
    };

    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setInteractions(prev => [saved, ...prev]);
        setShowInteractionModal(false);
        setInterSummary('');
        setInterAction('');
      }
    } catch (err) {
      alert('Error saving meeting log.');
    }
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !activeStudent) return;

    const payload = {
      studentId: selectedStudentId,
      guardianName: activeStudent.guardianName || 'Parent',
      phoneNumber: activeStudent.guardianContact || '+256 700 000000',
      messageBody: smsCustomBody,
      status: 'Delivered', // simulate successful EMIS broadcast
      dateSent: new Date().toISOString().split('T')[0]
    };

    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setSmsLogs(prev => [saved, ...prev]);
        setSmsStatusAlert(true);
        setTimeout(() => {
          setSmsStatusAlert(false);
          setShowSMSModal(false);
        }, 1500);
      }
    } catch (err) {
      alert('Error recording SMS dispatch log.');
    }
  };

  const handleScanAbsenceAlerts = () => {
    const absentRecords = attendance.filter(att => att.date === campaignDate && att.status === 'Absent');
    
    const alerts = absentRecords.map(rec => {
      const student = students.find(s => s.id === rec.studentId);
      if (!student) return null;
      
      const guardian = student.guardianName || 'Parent / Guardian';
      const contact = student.guardianContact || '+256 700 000000';
      const studentName = `${student.surname} ${student.otherNames}`;
      const message = `Dear ${guardian}, your child ${studentName} (Class ${student.className}) was marked ABSENT on ${campaignDate} from Nansana School. Please contact the class teacher.`;
      
      return {
        id: `campaign-abs-${rec.id}`,
        studentId: student.id,
        studentName,
        className: student.className,
        guardianName: guardian,
        phoneNumber: contact,
        messageBody: message,
        reason: 'Absence'
      };
    }).filter(Boolean);

    setPreparedCampaignAlerts(alerts);
    setSelectedCampaignAlertIds(alerts.map(a => a.id));
    
    setGatewayLogs(prev => [
      `[${new Date().toLocaleTimeString()}] Scanned attendance for ${campaignDate}. Found ${alerts.length} absent student(s).`,
      ...prev
    ]);
  };

  const handleSimulateAbsences = async () => {
    const randomStudents = [...students].sort(() => 0.5 - Math.random()).slice(0, 3);
    const records = randomStudents.map(student => ({
      studentId: student.id,
      date: campaignDate,
      status: 'Absent'
    }));

    try {
      const res = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });
      if (res.ok) {
        const attRes = await fetch('/api/attendance');
        if (attRes.ok) {
          const attData = await attRes.json();
          setAttendance(attData);
          
          const absentRecords = attData.filter(att => att.date === campaignDate && att.status === 'Absent');
          const alerts = absentRecords.map(rec => {
            const student = students.find(s => s.id === rec.studentId);
            if (!student) return null;
            const guardian = student.guardianName || 'Parent / Guardian';
            const contact = student.guardianContact || '+256 700 000000';
            const studentName = `${student.surname} ${student.otherNames}`;
            const message = `Dear ${guardian}, your child ${studentName} (Class ${student.className}) was marked ABSENT on ${campaignDate} from Nansana School. Please contact the class teacher.`;
            return {
              id: `campaign-abs-${rec.id}`,
              studentId: student.id,
              studentName,
              className: student.className,
              guardianName: guardian,
              phoneNumber: contact,
              messageBody: message,
              reason: 'Absence'
            };
          }).filter(Boolean);

          setPreparedCampaignAlerts(alerts);
          setSelectedCampaignAlertIds(alerts.map(a => a.id));
          
          setGatewayLogs(prev => [
            `[${new Date().toLocaleTimeString()}] Simulated & saved 3 absences for ${campaignDate} in database.`,
            `[${new Date().toLocaleTimeString()}] Scanned attendance. Prepared ${alerts.length} absence alert(s).`,
            ...prev
          ]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScanReportAlerts = () => {
    const targetStudents = campaignClass === 'All' 
      ? students 
      : students.filter(s => s.className === campaignClass);
      
    const alerts = targetStudents.map(student => {
      const studentMarks = marks.filter(m => m.studentId === student.id && m.term === campaignTerm && m.year === campaignYear);
      if (studentMarks.length === 0) return null;
      
      const totalScore = studentMarks.reduce((sum, m) => sum + m.score, 0);
      const averageScore = Number((totalScore / studentMarks.length).toFixed(1));
      
      const guardian = student.guardianName || 'Parent / Guardian';
      const contact = student.guardianContact || '+256 700 000000';
      const studentName = `${student.surname} ${student.otherNames}`;
      const message = `Dear ${guardian}, Term ${campaignTerm} report card for ${studentName} (Class ${student.className}) is ready. Avg: ${averageScore}%. Please pick it up from Nansana school office.`;
      
      return {
        id: `campaign-rep-${student.id}-${campaignTerm}-${campaignYear}`,
        studentId: student.id,
        studentName,
        className: student.className,
        guardianName: guardian,
        phoneNumber: contact,
        messageBody: message,
        averageScore,
        reason: 'Report Card'
      };
    }).filter(Boolean);

    setPreparedCampaignAlerts(alerts);
    setSelectedCampaignAlertIds(alerts.map(a => a.id));

    setGatewayLogs(prev => [
      `[${new Date().toLocaleTimeString()}] Scanned grades for Term ${campaignTerm} ${campaignYear} (${campaignClass} cohort). Prepared ${alerts.length} report card notification(s).`,
      ...prev
    ]);
  };

  const handleDispatchCampaign = async () => {
    const alertsToDispatch = preparedCampaignAlerts.filter(a => selectedCampaignAlertIds.includes(a.id));
    if (alertsToDispatch.length === 0) return;

    setCampaignDispatching(true);
    setCampaignDispatchProgress(0);
    setCampaignDispatchStatusText('Connecting to Uganda Bulk SMS Gateway Node...');

    await new Promise(resolve => setTimeout(resolve, 800));

    let successfulCount = 0;
    let totalSmsCost = 0;
    const newLogs: SMSLog[] = [];

    for (let i = 0; i < alertsToDispatch.length; i++) {
      const alert = alertsToDispatch[i];
      const progressPercent = Math.round(((i + 1) / alertsToDispatch.length) * 100);
      setCampaignDispatchProgress(progressPercent);
      setCampaignDispatchStatusText(`Transmitting alert ${i + 1} of ${alertsToDispatch.length} to ${alert.phoneNumber}...`);

      const cost = Math.max(1, Math.ceil(alert.messageBody.length / 160));
      totalSmsCost += cost;

      const payload = {
        studentId: alert.studentId,
        guardianName: alert.guardianName,
        phoneNumber: alert.phoneNumber,
        messageBody: alert.messageBody,
        status: 'Delivered',
        dateSent: new Date().toISOString().split('T')[0]
      };

      try {
        const res = await fetch('/api/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const savedLog = await res.json();
          newLogs.push(savedLog);
          
          if (savedLog.status === 'Delivered') {
            successfulCount++;
            setGatewayLogs(prev => [
              `[${new Date().toLocaleTimeString()}] ${savedLog.gatewayUsed || 'Gateway'} Success! msgId: ${savedLog.messageId || 'N/A'}, recipient: ${alert.phoneNumber}, cost: ${cost} credit(s).`,
              ...prev
            ]);
          } else {
            setGatewayLogs(prev => [
              `[${new Date().toLocaleTimeString()}] ${savedLog.gatewayUsed || 'Gateway'} Error! Failed to transmit to ${alert.phoneNumber}. Reason: ${savedLog.errorMessage || 'Unknown error'}`,
              ...prev
            ]);
          }
        }
      } catch (err) {
        console.error('Error sending sms during campaign:', err);
        setGatewayLogs(prev => [
          `[${new Date().toLocaleTimeString()}] Gateway Network Error! Failed to transmit to ${alert.phoneNumber}.`,
          ...prev
        ]);
      }

      await new Promise(resolve => setTimeout(resolve, 400));
    }

    const finalCredits = Math.max(0, smsCredits - totalSmsCost);
    setSmsCredits(finalCredits);
    localStorage.setItem('sms_credits_balance', String(finalCredits));

    setSmsLogs(prev => [...newLogs, ...prev]);

    setCampaignDispatchStatusText(`Campaign complete! Dispatched ${successfulCount} of ${alertsToDispatch.length} alerts successfully.`);
    setGatewayLogs(prev => [
      `[${new Date().toLocaleTimeString()}] Campaign Dispatch Complete! Total cost: ${totalSmsCost} credits. Remaining: ${finalCredits.toLocaleString()} units.`,
      ...prev
    ]);

    setTimeout(() => {
      setCampaignDispatching(false);
      setPreparedCampaignAlerts([]);
      setSelectedCampaignAlertIds([]);
    }, 3000);
  };

  const toggleSelectCampaignAlert = (id: string) => {
    setSelectedCampaignAlertIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCampaignAlerts = () => {
    if (selectedCampaignAlertIds.length === preparedCampaignAlerts.length) {
      setSelectedCampaignAlertIds([]);
    } else {
      setSelectedCampaignAlertIds(preparedCampaignAlerts.map(a => a.id));
    }
  };

  return (
    <div id="guardian_communication_view" className="p-8 space-y-6 font-sans max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-150 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
            <Smartphone className="h-3 w-3 text-teal-500" /> Parent Portal Integration
          </div>
          <h1 className="font-display text-2xl font-black text-slate-800">Guardian Engagement Hub</h1>
          <p className="text-xs text-slate-400 mt-1">Track classroom engagement reports, record family visits / phone interactions, and dispatch official SMS notices.</p>
        </div>

        {/* Sub-Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 self-start md:self-center">
          <button
            onClick={() => setSubTab('interactions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'interactions'
                ? 'bg-white text-indigo-600 shadow-md font-black scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Parent Meetings & Logs</span>
          </button>
          <button
            onClick={() => setSubTab('sms')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'sms'
                ? 'bg-white text-indigo-600 shadow-md font-black scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>SMS Notification Dispatch</span>
          </button>
          <button
            onClick={() => setSubTab('push')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'push'
                ? 'bg-white text-indigo-600 shadow-md font-black scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BellRing className="h-4 w-4" />
            <span>Teacher Push Alerts</span>
          </button>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="flex flex-wrap bg-slate-50 p-1.5 rounded-2xl gap-1 border border-slate-150">
        {classesList.map((c) => {
          const isSelected = selectedClass === c;
          return (
            <button
              key={c}
              onClick={() => setSelectedClass(c)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Class {c}
            </button>
          );
        })}
      </div>

      {subTab === 'interactions' ? (
        <div className="space-y-6">
          {/* Action Header block */}
          <div className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-400 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300">
            <div>
              <h2 className="text-lg font-black text-slate-800">Meeting Logs & Phone Logs</h2>
              <p className="text-xs text-slate-400 mt-0.5">Maintain legal, structured interaction histories for registered guardians in Wakiso District.</p>
            </div>

            <button
              onClick={() => {
                if (filteredStudents.length > 0) {
                  setSelectedStudentId(filteredStudents[0].id);
                }
                setShowInteractionModal(true);
              }}
              disabled={filteredStudents.length === 0}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Log Parent Interaction</span>
            </button>
          </div>

          {/* List section */}
          {interactions.filter(i => filteredStudents.some(s => s.id === i.studentId)).length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-transparent py-16 text-center text-slate-400 text-xs">
              <PhoneCall className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              No guardian interactions registered for Class {selectedClass} this term.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {interactions
                .filter(i => filteredStudents.some(s => s.id === i.studentId))
                .map(item => {
                  const student = students.find(s => s.id === item.studentId);
                  if (!student) return null;
                  return (
                    <div key={item.id} className="vibrant-card p-6 space-y-4 relative">
                      <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            item.type === 'Phone Call' ? 'bg-indigo-50 text-indigo-700' :
                            item.type === 'In-Person Meeting' ? 'bg-emerald-50 text-emerald-700' :
                            item.type === 'SMS Alert' ? 'bg-sky-50 text-sky-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-400 font-black uppercase">PUPIL PROFILE</span>
                        <h4 className="text-sm font-extrabold text-slate-800 uppercase leading-none">{student.surname} {student.otherNames}</h4>
                        <p className="text-xs text-slate-500 font-medium">Guardian: <strong className="text-slate-700">{item.guardianName}</strong></p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl text-xs text-slate-600 space-y-2 border border-slate-100">
                        <p className="leading-relaxed">
                          <strong className="text-slate-800 uppercase tracking-wider text-[9px] block mb-1">Interaction Notes:</strong>
                          {item.summary}
                        </p>
                        {item.actionRequired && (
                          <p className="leading-relaxed pt-2.5 border-t border-slate-200">
                            <strong className="text-slate-800 uppercase tracking-wider text-[9px] block mb-1 text-indigo-600">Action Plan / Follow Up:</strong>
                            {item.actionRequired}
                          </p>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono text-right">
                        Logged by: {item.loggedBy}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : subTab === 'sms' ? (
        <div className="space-y-6">
          {/* SMS Dashboard Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Campaign Control Panel (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-6">
                
                {/* Header */}
                <div className="border-b border-slate-150 pb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-indigo-600 shrink-0" />
                      Automated Alerts Campaign Manager
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Configure, preview, and dispatch bulk SMS reminders using active student records.</p>
                  </div>
                  
                  {/* Single Send option */}
                  <button
                    onClick={() => {
                      if (filteredStudents.length > 0) {
                        setSelectedStudentId(filteredStudents[0].id);
                      }
                      setShowSMSModal(true);
                    }}
                    disabled={filteredStudents.length === 0}
                    className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer text-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Single Send SMS</span>
                  </button>
                </div>

                {/* Campaign Selector / Tabs */}
                <div className="grid grid-cols-2 bg-slate-50 p-1 rounded-2xl border border-slate-150">
                  <button
                    type="button"
                    onClick={() => {
                      setCampaignType('absence');
                      setPreparedCampaignAlerts([]);
                      setSelectedCampaignAlertIds([]);
                    }}
                    className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      campaignType === 'absence'
                        ? 'bg-white text-indigo-600 shadow-sm font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>Absence Notice Campaign</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCampaignType('report');
                      setPreparedCampaignAlerts([]);
                      setSelectedCampaignAlertIds([]);
                    }}
                    className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      campaignType === 'report'
                        ? 'bg-white text-indigo-600 shadow-sm font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Termly Report Card Campaign</span>
                  </button>
                </div>

                {/* Dynamic Configuration Form */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-4">
                  {campaignType === 'absence' ? (
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Select Attendance Date *</label>
                        <input
                          type="date"
                          value={campaignDate}
                          onChange={(e) => setCampaignDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none font-bold"
                        />
                      </div>
                      
                      <div className="flex gap-2 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={handleSimulateAbsences}
                          className="px-4 py-2.5 border-2 border-dashed border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Fills attendance database with random test absentees for easy verification."
                        >
                          Simulate Absences
                        </button>
                        <button
                          type="button"
                          onClick={handleScanAbsenceAlerts}
                          className="px-5 py-2.5 bg-[#032b5e] hover:bg-[#07397c] text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Scan Absentees</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Target Class *</label>
                          <select
                            value={campaignClass}
                            onChange={(e) => setCampaignClass(e.target.value as any)}
                            className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                          >
                            <option value="All">All Classes</option>
                            {classesList.map(c => <option key={c} value={c}>Class {c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Term *</label>
                          <select
                            value={campaignTerm}
                            onChange={(e) => setCampaignTerm(Number(e.target.value) as any)}
                            className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                          >
                            <option value={1}>Term 1</option>
                            <option value={2}>Term 2</option>
                            <option value={3}>Term 3</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Academic Year *</label>
                          <input
                            type="number"
                            value={campaignYear}
                            onChange={(e) => setCampaignYear(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none font-bold"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={handleScanReportAlerts}
                            className="w-full py-2.5 bg-[#032b5e] hover:bg-[#07397c] text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Scan Grades</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Prepared alerts ledger */}
                {preparedCampaignAlerts.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-600">
                        Prepared <strong className="text-indigo-600">{preparedCampaignAlerts.length}</strong> alerts. (Selected: <strong className="text-indigo-600">{selectedCampaignAlertIds.length}</strong>)
                      </span>
                      <button
                        type="button"
                        onClick={toggleSelectAllCampaignAlerts}
                        className="text-indigo-600 font-extrabold hover:underline"
                      >
                        {selectedCampaignAlertIds.length === preparedCampaignAlerts.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="border border-slate-150 rounded-2xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {preparedCampaignAlerts.map((alert) => {
                        const isSelected = selectedCampaignAlertIds.includes(alert.id);
                        return (
                          <div
                            key={alert.id}
                            onClick={() => toggleSelectCampaignAlert(alert.id)}
                            className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all ${
                              isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/50'
                            }`}
                          >
                            <span className="shrink-0 mt-0.5 text-indigo-600">
                              {isSelected ? (
                                <CheckSquare className="h-4.5 w-4.5" />
                              ) : (
                                <Square className="h-4.5 w-4.5 text-slate-300" />
                              )}
                            </span>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs text-slate-800">
                              <div className="sm:col-span-4">
                                <span className="font-extrabold text-slate-900 block leading-tight">{alert.studentName}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Class {alert.className} • Guardian: {alert.guardianName}</span>
                              </div>
                              <div className="sm:col-span-8 bg-white/80 p-2 rounded-xl border border-slate-100 font-medium text-slate-600 text-[11px] leading-relaxed">
                                {alert.messageBody}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Campaign Dispatch Action block */}
                    <div className="border-t border-slate-150 pt-5 space-y-4">
                      {campaignDispatching ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-black text-slate-700">
                            <span className="flex items-center gap-1.5 animate-pulse">
                              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></span>
                              {campaignDispatchStatusText}
                            </span>
                            <span>{campaignDispatchProgress}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                              style={{ width: `${campaignDispatchProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                          <div className="text-xs text-slate-600">
                            <p className="font-bold">Ready to dispatch automated campaign</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Estimated total gateway charge: <strong className="text-indigo-600">{selectedCampaignAlertIds.length} credit(s)</strong>
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleDispatchCampaign}
                            disabled={selectedCampaignAlertIds.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Play className="h-4 w-4" />
                            <span>Dispatch Campaign ({selectedCampaignAlertIds.length})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
                    <Sliders className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-500">Campaign Preview Standby</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto leading-normal">
                      Select campaign options and click scan above to query the registry databases and preview targeted SMS notifications.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: SMS Gateway Module Console (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Gateway Status card */}
              <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-5">
                <div className="border-b border-slate-150 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">SMS Gateway Node</h3>
                    <p className="text-indigo-600 text-[10px] font-black uppercase tracking-wider mt-0.5">{gatewayStatus.activeGateway}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    gatewayStatus.activeGateway === 'Sandbox Simulator' 
                      ? 'bg-amber-50 text-amber-700 border-amber-150' 
                      : 'bg-green-50 text-green-700 border-green-150'
                  }`}>
                    <span className={`w-1 h-1 rounded-full animate-ping ${
                      gatewayStatus.activeGateway === 'Sandbox Simulator' ? 'bg-amber-500' : 'bg-green-500'
                    }`}></span>
                    {gatewayStatus.activeGateway === 'Sandbox Simulator' ? 'SANDBOX' : 'LIVE'}
                  </span>
                </div>

                <div className="space-y-4">
                  
                  {/* Credit display */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block leading-none">Gateway Balance</span>
                      <strong className="text-2xl font-black text-slate-800 tracking-tight block mt-1.5">{smsCredits.toLocaleString()}</strong>
                      <span className="text-[9px] text-slate-400 mt-1 block">
                        {gatewayStatus.activeGateway === "Africa's Talking" 
                          ? `Credits (at: ${gatewayStatus.atUsername || 'live'})`
                          : gatewayStatus.activeGateway === 'Twilio'
                          ? `Credits (twilio: ${gatewayStatus.twilioFrom || 'live'})`
                          : 'Credits (Uganda Telecom)'
                        }
                      </span>
                    </div>
                    <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Zap className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Pricing info */}
                  <div className="text-[10px] text-slate-500 space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-150/50 font-medium">
                    <div className="flex justify-between">
                      <span>SMS Credit Unit Rate:</span>
                      <strong className="text-slate-700">1 Credit / SMS Unit</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Character Segment limit:</span>
                      <strong className="text-slate-700">160 Characters</strong>
                    </div>
                    {gatewayStatus.activeGateway === 'Sandbox Simulator' && (
                      <div className="pt-2 border-t border-slate-150 text-[9px] text-amber-600 leading-normal">
                        <strong>PRO TIP:</strong> To send real SMS alerts, add <code>AFRICAS_TALKING_API_KEY</code> and <code>AFRICAS_TALKING_USERNAME</code> to your app secrets.
                      </div>
                    )}
                  </div>

                  {/* Refill campaign credits simulation */}
                  <button
                    type="button"
                    onClick={() => {
                      const newBal = smsCredits + 1000;
                      setSmsCredits(newBal);
                      localStorage.setItem('sms_credits_balance', String(newBal));
                      setGatewayLogs(prev => [
                        `[${new Date().toLocaleTimeString()}] Refilled 1,000 credits via Mobile Money. Active Gateway: ${gatewayStatus.activeGateway}`,
                        ...prev
                      ]);
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Purchase Credits (+1,000)</span>
                  </button>
                </div>
              </div>

              {/* Gateway Logs Terminal (Live output console) */}
              <div className="bg-[#050e18] rounded-3xl p-5 shadow-inner space-y-3.5 border border-slate-900">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h4 className="text-xs text-slate-400 font-mono flex items-center gap-1.5 font-bold">
                    <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                    Live Transmission Log
                  </h4>
                  <button
                    type="button"
                    onClick={() => setGatewayLogs([`[${new Date().toLocaleTimeString()}] Terminal cleared.`])}
                    className="text-[9px] text-slate-500 font-mono hover:text-slate-300 font-bold"
                  >
                    Clear log
                  </button>
                </div>
                <div className="h-44 overflow-y-auto space-y-1 font-mono text-[10px] text-slate-300 leading-normal scrollbar-thin scrollbar-thumb-slate-800">
                  {gatewayLogs.map((log, index) => {
                    let color = 'text-slate-300';
                    if (log.includes('Success')) color = 'text-green-400';
                    if (log.includes('Error')) color = 'text-red-400';
                    if (log.includes('Refilled')) color = 'text-yellow-400';
                    return (
                      <div key={index} className={`${color} border-l border-slate-800 pl-1.5`}>
                        {log}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Outbox History Block */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm">SMS Outbox Broadcast History</h3>
            
            {smsLogs.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-150 py-16 text-center text-slate-400 text-xs text-slate-400">
                <MessageSquare className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                No SMS alerts found in the outbound queue.
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase font-black tracking-wider border-b border-slate-100">
                      <th className="px-6 py-4">Recipient Guardian</th>
                      <th className="px-6 py-4">Contact Phone</th>
                      <th className="px-6 py-4">Message Context</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {smsLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <strong className="text-slate-800 uppercase block">{log.guardianName}</strong>
                        </td>
                        <td className="px-6 py-3.5 font-mono text-slate-500">
                          {log.phoneNumber}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 font-medium max-w-sm truncate" title={log.messageBody}>
                          {log.messageBody}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wide bg-green-100 text-green-700 border border-green-200">
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-400 font-mono">
                          {log.dateSent}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status alerts */}
          {pushSuccessMessage && (
            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border border-emerald-150 shadow-sm animate-in fade-in duration-300">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <span>{pushSuccessMessage}</span>
            </div>
          )}

          {pushErrorMessage && (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border border-red-150 shadow-sm animate-in fade-in duration-300">
              <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
              <span>{pushErrorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT SIDEBAR: Device Enrollment & Device Status */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Your Device Channel</h3>
                    <p className="text-slate-400 text-[10px] mt-0.5">Enroll this hardware to receive instant teacher alerts.</p>
                  </div>
                  <Tv className="h-4 w-4 text-[#032b5e] shrink-0" />
                </div>

                {!pushSupported ? (
                  <div className="bg-slate-50 p-4 rounded-2xl text-center space-y-2 border border-slate-150">
                    <BellOff className="h-8 w-8 text-slate-300 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-600">Push Notifications Unsupported</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Your current browser or environment lacks active ServiceWorker or PushManager support. Please log in on Google Chrome or Microsoft Edge.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pushSubscribed ? (
                      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-150 text-center space-y-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 relative">
                          <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></span>
                          <BellRing className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Connected to EMIS Node
                          </span>
                          <h4 className="text-xs font-black text-slate-800 uppercase mt-2">
                            {teacher?.name || 'Authorized Device'}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Role: {teacher?.username || 'teacher'}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-200/50 flex flex-col gap-2">
                          <button
                            onClick={async () => {
                              try {
                                setPushLoading(true);
                                const currentSub = await getActiveSubscription();
                                if (!currentSub) throw new Error("No subscription session found.");
                                
                                const testRes = await fetch('/api/push/send', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    title: '🔔 Test Real-Time Push Notification',
                                    body: `Congratulations! Your teacher device is securely integrated with the Uganda National EMIS Node. Sent: ${new Date().toLocaleTimeString()}`,
                                    tag: 'emis-test',
                                    clickAction: '/'
                                  })
                                });
                                if (testRes.ok) {
                                  setPushSuccessMessage('A live Web Push payload was encrypted and broadcasted! You should receive it on this device in a second.');
                                } else {
                                  throw new Error("Push dispatch rejected by server.");
                                }
                              } catch (err: any) {
                                setPushErrorMessage(err.message || "Failed to trigger test notification.");
                              } finally {
                                setPushLoading(false);
                              }
                            }}
                            disabled={pushLoading}
                            className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                          >
                            Send Test Notification
                          </button>
                          <button
                            onClick={handleUnsubscribe}
                            disabled={pushLoading}
                            className="w-full py-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                          >
                            Unenroll Device
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 text-center space-y-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-400">
                          <BellOff className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] bg-slate-200 text-slate-600 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Device Not Enrolled
                          </span>
                          <h4 className="text-xs font-extrabold text-slate-800 mt-2">Alert Tunnel Standby</h4>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Register this workstation to allow supervisors to send 'Urgent Safeguarding Alerts' or 'Mark Entry Reminders' to your desktop even if this app is closed.
                          </p>
                        </div>
                        <button
                          onClick={handleSubscribe}
                          disabled={pushLoading}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <BellRing className="h-3.5 w-3.5" />
                          <span>Enroll This Device</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Push subscriptions statistics card */}
              <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Network Registry</h3>
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-md">
                    {pushSubscriptionsList.length} Active Nodes
                  </span>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {pushSubscriptionsList.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-4">No other devices registered in the Wakiso directory yet.</p>
                  ) : (
                    pushSubscriptionsList.map((sub, idx) => (
                      <div key={sub.id || idx} className="pt-2 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-extrabold text-slate-800 capitalize">{sub.username}</p>
                          <p className="text-[9px] text-slate-400 font-mono max-w-[160px] truncate">{sub.subscription?.endpoint}</p>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap">
                          {new Date(sub.subscribedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT MAIN PANEL: Administrator Broadcaster & Ledger History */}
            <div className="lg:col-span-8 space-y-6">
              {/* Push Notification Broadcaster Form */}
              <div className="bg-white rounded-3xl border-2 border-indigo-150/40 p-6 shadow-sm space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-800">National Node Push Broadcasting Console</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Authoritative dispatch center. Instant push delivery to all teachers on the Uganda EMIS grid.</p>
                  </div>
                  <Radio className="h-5 w-5 text-indigo-600 animate-pulse shrink-0" />
                </div>

                <form onSubmit={handleSendPush} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Select Broadcast Template Context *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPushTemplate('safeguarding-urgent')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                          pushTemplate === 'safeguarding-urgent'
                            ? 'bg-red-50 text-red-800 border-red-300 font-bold shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span>
                          Safeguarding Alert
                        </span>
                        <span className="text-[9px] text-slate-400 leading-tight">Urgent pupil risk notification</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPushTemplate('mark-reminder')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                          pushTemplate === 'mark-reminder'
                            ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                          Mark Entry Reminder
                        </span>
                        <span className="text-[9px] text-slate-400 leading-tight">Past-due assessment reminder</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPushTemplate('custom')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                          pushTemplate === 'custom'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-300 font-bold shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs font-bold">Custom Notification</span>
                        <span className="text-[9px] text-slate-400 leading-tight">Draft completely bespoke text</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Notification Title *</label>
                      <input
                        type="text"
                        value={pushTitle}
                        onChange={(e) => setPushTitle(e.target.value)}
                        placeholder="Type header title..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Target Click Route *</label>
                      <select
                        value={pushTargetUrl}
                        onChange={(e) => setPushTargetUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-850 focus:outline-none"
                        required
                      >
                        <option value="/">Dashboard home page</option>
                        <option value="/cases">Safeguarding Ledger (Community Hub)</option>
                        <option value="/marks">Marks Entry Center (Academics)</option>
                        <option value="/attendance">Attendance Registrar</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Alert Message Body Context *</label>
                    <textarea
                      value={pushBody}
                      onChange={(e) => setPushBody(e.target.value)}
                      placeholder="Type details that will display on teacher lockscreeens even if app is closed..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-850 focus:outline-none h-20 resize-none leading-relaxed"
                      required
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                    <span className="text-[10px] text-slate-400 leading-tight">
                      This will transmit a real Web Push payload to all <strong>{pushSubscriptionsList.length}</strong> subscribed teacher browsers.
                    </span>
                    <button
                      type="submit"
                      disabled={pushLoading || pushSubscriptionsList.length === 0}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <Radio className="h-4 w-4 shrink-0" />
                      <span>Transmit Push Broadcast</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Push history ledger auditing */}
              <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <History className="h-4 w-4 text-slate-500" />
                    National Node Push Audit Ledger
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">Chronological list of all Web Push broadcasts issued by the administrative center.</p>
                </div>

                {pushHistoryList.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No push alerts have been dispatched on the network registry this term.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-100">
                          <th className="px-4 py-3">Dispatched Title / Context</th>
                          <th className="px-4 py-3">Target Context</th>
                          <th className="px-4 py-3 whitespace-nowrap">Audience Reach</th>
                          <th className="px-4 py-3 text-right">Sent Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {pushHistoryList.map(alert => (
                          <tr key={alert.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3.5 space-y-1 max-w-xs">
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                alert.tag === 'safeguarding-urgent' ? 'bg-red-50 text-red-700' :
                                alert.tag === 'mark-reminder' ? 'bg-amber-50 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {alert.tag}
                              </span>
                              <strong className="text-slate-800 block text-xs mt-1">{alert.title}</strong>
                              <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">{alert.body}</p>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-[10px] text-slate-500">
                              {alert.clickAction}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className="text-emerald-600">{alert.successCount} Delivery</span>
                                {alert.failureCount > 0 && (
                                  <span className="text-slate-400">({alert.failureCount} offline)</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-slate-400 text-[10px] font-mono text-right whitespace-nowrap">
                              {new Date(alert.sentAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interaction Modal Dialog Form */}
      {showInteractionModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setShowInteractionModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={handleAddInteraction} className="p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-display font-extrabold text-lg text-slate-800">Record Parent Interaction</h3>
                <p className="text-slate-400 text-xs mt-1">Log counseling discussions, financial or academic reports.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Select Pupil *</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                  required
                >
                  {filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.surname} {s.otherNames}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Interaction Type *</label>
                <select
                  value={interType}
                  onChange={(e) => setInterType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-850 focus:outline-none"
                  required
                >
                  <option value="Phone Call">Phone Call Discussion</option>
                  <option value="In-Person Meeting">In-Person School Meeting</option>
                  <option value="SMS Alert">SMS Alert & Request</option>
                  <option value="Home Visit Follow-up">Home Visit Follow-up</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Conversation Notes *</label>
                <textarea
                  placeholder="e.g. Guardian confirmed scholarship support application forms were signed."
                  value={interSummary}
                  onChange={(e) => setInterSummary(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none h-24 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Follow-up Action Plan</label>
                <input
                  type="text"
                  placeholder="e.g. Expecting guardian to submit passport photos next Monday."
                  value={interAction}
                  onChange={(e) => setInterAction(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Authorized Official *</label>
                <input
                  type="text"
                  value={interLoggedBy}
                  onChange={(e) => setInterLoggedBy(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInteractionModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md cursor-pointer"
                >
                  Log Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SMS Compose Dialog Modal */}
      {showSMSModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setShowSMSModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={handleSendSMS} className="p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-display font-extrabold text-lg text-slate-800 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-indigo-600" /> Compose SMS Alert
                </h3>
                <p className="text-slate-400 text-xs mt-1">Dispatches a simulated SMS notification directly to the parent cell network.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Target Student Profile *</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-800 focus:outline-none"
                  required
                >
                  {filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.surname} {s.otherNames}</option>
                  ))}
                </select>
              </div>

              {activeStudent && (
                <div className="bg-slate-50 p-3 rounded-2xl text-[11px] text-slate-500 grid grid-cols-2 gap-1 border border-slate-150">
                  <p>Guardian: <strong className="text-slate-700">{activeStudent.guardianName || 'None'}</strong></p>
                  <p>Phone: <strong className="text-slate-700 font-mono">{activeStudent.guardianContact || 'None'}</strong></p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">SMS Quick-Templates</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'attendance', label: 'Absence Warn' },
                    { id: 'performance', label: 'Marks meeting' },
                    { id: 'fees', label: 'Fees Notice' }
                  ].map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSmsTemplate(tpl.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        smsTemplate === tpl.id 
                          ? 'bg-indigo-600 text-white border-indigo-600 font-black' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Message Body *</label>
                <textarea
                  placeholder="Type message text here..."
                  value={smsCustomBody}
                  onChange={(e) => setSmsCustomBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-xs text-slate-850 focus:outline-none h-24 resize-none"
                  required
                />
                <span className="text-[10px] text-slate-400 block mt-1 font-mono">Character Count: {smsCustomBody.length} (1 SMS credit unit per 160 characters)</span>
              </div>

              {smsStatusAlert && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 border border-emerald-150 animate-pulse">
                  <Check className="h-4 w-4" /> Message Sent Successfully via EMIS Network!
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSMSModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={smsStatusAlert}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Broadcast</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
