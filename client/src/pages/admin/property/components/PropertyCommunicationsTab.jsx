import React, { useState } from 'react';
import { MessageSquare, Send, User } from 'lucide-react';
import { VerificationSectionCard } from '../../../../components/verification';
import { MOCK_COMMUNICATIONS } from '../../../../mocks/adminPropertyMock';

export default function PropertyCommunicationsTab({ property }) {
  const [comms, setComms] = useState(MOCK_COMMUNICATIONS);
  const [newMsg, setNewMsg] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setComms((prev) => [
      { id: `c_${Date.now()}`, sender: 'Alex Mercer', role: 'Compliance Lead', timestamp: new Date().toISOString(), text: newMsg.trim() },
      ...prev,
    ]);
    setNewMsg('');
  };

  return (
    <VerificationSectionCard title="Manager, Tenant & Compliance Internal Communications" icon={MessageSquare}>
      <div className="space-y-4 text-xs">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            placeholder="Post internal note, escalation request, or manager inquiry..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold flex items-center gap-1">
            <Send className="w-3.5 h-3.5" /> Send Note
          </button>
        </form>

        <div className="space-y-3 pt-2">
          {comms.map((c) => (
            <div key={c.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-slate-200">{c.sender} · <span className="text-indigo-400 font-normal">{c.role}</span></span>
                <span className="text-slate-500">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-slate-300">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </VerificationSectionCard>
  );
}
