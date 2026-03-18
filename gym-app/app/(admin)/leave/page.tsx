"use client";

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { CalendarOff, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Ban, RefreshCw } from 'lucide-react';

type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface LeaveReq {
  _id: string;
  userId: { _id: string; name: string; email: string };
  dates: string[];
  reason: string;
  status: LeaveStatus;
  adminNote?: string;
  extensionApplied: boolean;
  forcedDates: string[];
  createdAt: string;
}

const STATUS_TABS: LeaveStatus[] = ['pending', 'approved', 'rejected'];

export default function AdminLeavePage() {
  const { getAccessToken } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<LeaveStatus>('pending');
  const [requests, setRequests] = useState<LeaveReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/leave/admin/requests?status=${activeTab}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const j = await res.json();
      if (j.ok) setRequests(j.data.requests || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [getAccessToken, activeTab]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: 'approve' | 'reject', note?: string) => {
    setActionLoading(id + action);
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/leave/admin/requests/${id}/${action}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ adminNote: note || '' }),
        }
      );
      const j = await res.json();
      if (j.ok) {
        toast.success(action === 'approve' ? `Approved — subscription extended by ${j.data.daysAdded} day(s)` : 'Rejected');
        setExpanded(null);
        setAdminNote('');
        await load();
      } else toast.error(j.error?.message || 'Action failed');
    } catch { toast.error('Action failed'); }
    finally { setActionLoading(null); }
  };

  const forceCame = async (requestId: string, date: string) => {
    setActionLoading(requestId + date);
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/leave/admin/requests/${requestId}/force-came`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ date }),
        }
      );
      const j = await res.json();
      if (j.ok) { toast.success(`Marked ${date} as attended — 1 day reverted`); await load(); }
      else toast.error(j.error?.message || 'Failed');
    } catch { toast.error('Failed'); }
    finally { setActionLoading(null); }
  };

  const statusBadge = (s: LeaveStatus) => {
    const map: Record<LeaveStatus, string> = {
      pending: 'bg-amber-50 text-amber-700',
      approved: 'bg-green-50 text-green-700',
      rejected: 'bg-red-50 text-red-600',
      cancelled: 'bg-gray-50 text-gray-400',
    };
    return map[s];
  };

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">Admin</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Leave Requests</h1>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-xl text-xs font-black capitalize transition-colors ${
              activeTab === tab ? 'bg-black text-[#00E676]' : 'bg-white border border-gray-100 text-gray-500 hover:border-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <CalendarOff className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-black text-gray-300">No {activeTab} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <motion.div
              key={req._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              {/* Header row */}
              <button
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === req._id ? null : req._id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center text-[#00E676] text-[10px] font-black shrink-0">
                    {req.userId?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{req.userId?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{req.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs font-bold text-gray-400">{req.dates.length}d</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${statusBadge(req.status)}`}>{req.status}</span>
                  {expanded === req._id ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                </div>
              </button>

              {/* Expanded */}
              <AnimatePresence>
                {expanded === req._id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                      {/* Dates */}
                      <div>
                        <p className="label-cap mb-2">Leave Dates</p>
                        <div className="flex flex-wrap gap-1.5">
                          {req.dates.map(d => (
                            <div key={d} className="flex items-center gap-1">
                              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                req.forcedDates.includes(d)
                                  ? 'bg-blue-50 text-blue-600 line-through'
                                  : 'bg-amber-50 text-amber-700'
                              }`}>{d}</span>
                              {req.status === 'approved' && !req.forcedDates.includes(d) && (
                                <button
                                  onClick={() => forceCame(req._id, d)}
                                  disabled={actionLoading === req._id + d}
                                  className="text-[10px] font-bold text-gray-400 hover:text-blue-500 transition-colors"
                                  title="Mark as came anyway"
                                >
                                  {actionLoading === req._id + d ? '…' : 'came'}
                                </button>
                              )}
                              {req.forcedDates.includes(d) && (
                                <span className="text-[10px] text-blue-400 font-bold">attended</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reason */}
                      <div>
                        <p className="label-cap mb-1">Reason</p>
                        <p className="text-sm text-gray-700">{req.reason}</p>
                      </div>

                      {/* Admin note display */}
                      {req.adminNote && (
                        <div>
                          <p className="label-cap mb-1">Admin Note</p>
                          <p className="text-sm text-gray-500 italic">{req.adminNote}</p>
                        </div>
                      )}

                      {/* Actions for pending */}
                      {req.status === 'pending' && (
                        <div className="space-y-2 pt-1">
                          <textarea
                            value={adminNote}
                            onChange={e => setAdminNote(e.target.value)}
                            placeholder="Optional note to member…"
                            rows={2}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00E676]/40"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => act(req._id, 'reject', adminNote)}
                              disabled={!!actionLoading}
                              className="flex-1 h-9 rounded-xl border-2 border-red-100 text-xs font-black text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                            >
                              {actionLoading === req._id + 'reject' ? '…' : 'Reject'}
                            </button>
                            <button
                              onClick={() => act(req._id, 'approve', adminNote)}
                              disabled={!!actionLoading}
                              className="flex-1 h-9 rounded-xl bg-black text-[#00E676] text-xs font-black hover:bg-gray-900 transition-colors disabled:opacity-40"
                            >
                              {actionLoading === req._id + 'approve' ? '…' : `Approve (+${req.dates.length}d)`}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Force-came info for approved */}
                      {req.status === 'approved' && (
                        <p className="text-xs text-gray-400">
                          Subscription extended by {req.dates.length} day(s). Click <strong>came</strong> next to a date if the member attended.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
