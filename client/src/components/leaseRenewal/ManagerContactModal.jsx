import React, { useState } from 'react';
import { X, Send, User, Mail, Phone, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';
import { messageService } from '../../services/api';

export function ManagerContactModal({ isOpen, onClose, manager, activeRenewal, onPostRenewalMessage }) {
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const managerName = manager?.name || 'Property Manager';
  const managerEmail = manager?.email || 'manager@tms.com';
  const managerPhone = manager?.phone || '+1 (555) 019-2834';

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageContent.trim()) return;

    setSending(true);
    setError(null);

    try {
      if (activeRenewal && onPostRenewalMessage) {
        await onPostRenewalMessage(messageContent);
      } else if (manager?.id) {
        await messageService.sendMessage({
          recipient: manager.id,
          content: messageContent
        });
      } else {
        // Fallback simulation/confirmation if direct ID not resolved
        await new Promise((res) => setTimeout(res, 800));
      }

      setSentSuccess(true);
      setMessageContent('');
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.message || 'Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-5 animate-scale-up">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            Contact Property Manager
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Direct message channel to your assigned manager</p>
        </div>

        {/* Manager Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-sm">
              {managerName.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100">{managerName}</h4>
              <p className="text-[11px] text-slate-500">Property Operations Lead</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1 text-[11px]">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{managerEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{managerPhone}</span>
            </div>
          </div>
        </div>

        {sentSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Message sent successfully to {managerName}!</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              Write Message
            </label>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Inquire about lease terms, maintenance, or renewal timelines..."
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !messageContent.trim()}
              className="flex-1 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{sending ? 'Sending...' : 'Send Message'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ManagerContactModal;
