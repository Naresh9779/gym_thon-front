'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { ClipboardList, CheckCircle2, X, Loader2, Dumbbell, Salad, Trash2, StickyNote } from 'lucide-react';
import { getInitials } from '@/lib/utils';

type StatusTab = 'pending' | 'generated' | 'dismissed';

interface PlanRequest {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  planTypes: string[];
  requestedAt: string;
  status: string;
  checkIn?: {
    currentWeight?: number;
    energyLevel?: number;
    sleepQuality?: number;
    muscleSoreness?: number;
    injuries?: string;
    notes?: string;
  };
}

const TABS: { key: StatusTab; label: string }[] = [
  { key: 'pending',   label: 'Pending'   },
  { key: 'generated', label: 'Generated' },
  { key: 'dismissed', label: 'Dismissed' },
];

export default function RequestsPage() {
  const { getAccessToken } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<StatusTab>('pending');
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkDismissing, setBulkDismissing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [showDismissInput, setShowDismissInput] = useState(false);
  const [noteInputId, setNoteInputId] = useState<string | null>(null); // which card is showing the note input
  const [noteValues, setNoteValues] = useState<Record<string, string>>({}); // per-request note values
  const [bulkNote, setBulkNote] = useState('');

  const base = process.env.NEXT_PUBLIC_API_BASE_URL;

  const loadRequests = useCallback(async (tab: StatusTab) => {
    setLoading(true);
    setSelected(new Set());
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/plan-requests?status=${tab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) setRequests(json.data.requests || []);
      else setRequests([]);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [base, getAccessToken]);

  useEffect(() => {
    loadRequests(activeTab);
  }, [activeTab, loadRequests]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === requests.length) setSelected(new Set());
    else setSelected(new Set(requests.map(r => r._id)));
  };

  const handleGenerate = async (requestId: string, memberName: string) => {
    setActionId(requestId);
    const note = noteValues[requestId]?.trim() || undefined;
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/plan-requests/${requestId}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: note }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error?.message || 'Plan generation failed — AI could not produce a valid plan. Please retry.');
      toast.success(`Plans generated for ${memberName}!`);
      setNoteInputId(null);
      setNoteValues(prev => { const n = { ...prev }; delete n[requestId]; return n; });
      await loadRequests(activeTab);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate plans');
    } finally {
      setActionId(null);
    }
  };

  const handleDismiss = async (requestId: string) => {
    setActionId(requestId);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/plan-requests/${requestId}/dismiss`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: dismissReason }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error?.message || 'Failed');
      toast.success('Request dismissed');
      setDismissReason('');
      await loadRequests(activeTab);
    } catch (err: any) {
      toast.error(err.message || 'Failed to dismiss request');
    } finally {
      setActionId(null);
    }
  };

  const handleBulkDismiss = async () => {
    if (selected.size === 0) return;
    setBulkDismissing(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/plan-requests/bulk-dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestIds: Array.from(selected), note: dismissReason }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error?.message || 'Failed');
      toast.success(`Dismissed ${json.data?.dismissed ?? selected.size} request${selected.size !== 1 ? 's' : ''}`);
      setDismissReason('');
      setShowDismissInput(false);
      await loadRequests(activeTab);
    } catch (err: any) {
      toast.error(err.message || 'Failed to bulk dismiss');
    } finally {
      setBulkDismissing(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (selected.size === 0) return;
    setBulkGenerating(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${base}/api/admin/plan-requests/bulk-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestIds: Array.from(selected), adminNote: bulkNote.trim() || undefined }),
      });
      const json = await res.json();
      const results: { requestId: string; success: boolean; error?: string }[] = json.data?.results || [];
      const succeeded = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (succeeded > 0) toast.success(`Plans generated for ${succeeded} member${succeeded !== 1 ? 's' : ''}!`);
      if (failed > 0) toast.error(`${failed} plan${failed !== 1 ? 's' : ''} failed to generate — AI error. Please retry individually.`);
      if (!json.ok && succeeded === 0) throw new Error(json.error?.message || 'All generations failed');

      await loadRequests(activeTab);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate plans');
    } finally {
      setBulkGenerating(false);
    }
  };

  const daysWaiting = (requestedAt: string) =>
    Math.floor((Date.now() - new Date(requestedAt).getTime()) / 86400000);


  return (
    <div className="space-y-5">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="label-cap mb-1">Admin</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Plan Requests</h1>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                activeTab === tab.key
                  ? 'bg-black text-[#00E676] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Bulk actions bar */}
      {activeTab === 'pending' && !loading && requests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.size === requests.length && requests.length > 0}
                onChange={toggleAll}
                className="w-4 h-4 accent-black rounded cursor-pointer"
              />
              <span className="text-sm font-bold text-gray-600">
                {selected.size === 0 ? 'Select all' : `${selected.size} selected`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDismissInput(s => !s)}
                disabled={selected.size === 0}
                className="flex items-center gap-1.5 px-3 py-2 border-2 border-gray-200 text-sm font-black rounded-xl text-gray-600 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Dismiss{selected.size > 0 ? ` (${selected.size})` : ''}
              </button>
              <button
                onClick={handleBulkGenerate}
                disabled={selected.size === 0 || bulkGenerating}
                className="flex items-center gap-1.5 px-3 py-2 bg-black text-[#00E676] text-sm font-black rounded-xl hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {bulkGenerating ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                ) : (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Generate{selected.size > 0 ? ` (${selected.size})` : ''}</>
                )}
              </button>
            </div>
          </div>

          {/* Bulk note for generation */}
          <div className="px-4 pb-3 border-t border-gray-50 pt-3">
            <input
              type="text"
              value={bulkNote}
              onChange={e => setBulkNote(e.target.value)}
              placeholder="Admin note for AI (applies to all selected)… e.g. focus on compound lifts, no dairy"
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-gray-900 focus:outline-none"
            />
          </div>

          {/* Dismiss reason input */}
          {showDismissInput && (
            <div className="px-4 pb-3 border-t border-gray-50 pt-3 flex gap-2">
              <input
                type="text"
                value={dismissReason}
                onChange={e => setDismissReason(e.target.value)}
                placeholder="Reason for dismissal (optional)…"
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-gray-900 focus:outline-none"
              />
              <button
                onClick={handleBulkDismiss}
                disabled={bulkDismissing}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-black rounded-xl hover:bg-black disabled:opacity-50 transition-colors"
              >
                {bulkDismissing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Request list */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 px-6 py-16 text-center">
            <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-black text-gray-400">
              {activeTab === 'pending'   && 'No pending requests'}
              {activeTab === 'generated' && 'No generated requests'}
              {activeTab === 'dismissed' && 'No dismissed requests'}
            </p>
            <p className="text-xs text-gray-300 mt-1">
              {activeTab === 'pending' ? 'Members will appear here after submitting their check-in.' : 'Nothing to show here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req, idx) => {
              const member = req.userId;
              const ci = req.checkIn;
              const days = daysWaiting(req.requestedAt);
              const isActioning = actionId === req._id;
              const isSelected = selected.has(req._id);

              return (
                <motion.div
                  key={req._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`bg-white rounded-2xl border transition-all ${
                    isSelected ? 'border-gray-900' : 'border-gray-100'
                  }`}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {/* Checkbox (only for pending) */}
                      {activeTab === 'pending' && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(req._id)}
                          className="w-4 h-4 accent-black rounded cursor-pointer mt-1 shrink-0"
                        />
                      )}

                      {/* Avatar */}
                      <Link href={`/users/${member?._id}`} className="shrink-0 mt-0.5">
                        <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center text-[#00E676] text-[11px] font-black">
                          {member?.name ? getInitials(member.name) : '??'}
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Link
                            href={`/users/${member?._id}`}
                            className="text-sm font-black text-gray-900 hover:underline"
                          >
                            {member?.name || 'Unknown'}
                          </Link>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {days === 0 ? 'today' : `${days}d ago`}
                          </span>
                          {/* Plan type badges */}
                          {req.planTypes?.includes('workout') && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-black text-[#00E676]">
                              <Dumbbell className="w-2.5 h-2.5" /> Workout
                            </span>
                          )}
                          {req.planTypes?.includes('diet') && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                              <Salad className="w-2.5 h-2.5" /> Diet
                            </span>
                          )}
                        </div>

                        {/* Check-in summary */}
                        {ci && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1">
                            {ci.currentWeight && (
                              <span className="text-xs text-gray-500">⚖️ {ci.currentWeight}kg</span>
                            )}
                            {ci.energyLevel !== undefined && (
                              <span className="text-xs text-gray-500">⚡ Energy {ci.energyLevel}/5</span>
                            )}
                            {ci.sleepQuality !== undefined && (
                              <span className="text-xs text-gray-500">😴 Sleep {ci.sleepQuality}/5</span>
                            )}
                            {ci.muscleSoreness !== undefined && (
                              <span className="text-xs text-gray-500">💪 Soreness {ci.muscleSoreness}/5</span>
                            )}
                            {ci.injuries && (
                              <span className="text-xs text-red-500 font-medium">⚠️ {ci.injuries}</span>
                            )}
                          </div>
                        )}
                        {ci?.notes && (
                          <p className="text-xs text-gray-400 italic">"{ci.notes}"</p>
                        )}
                      </div>

                      {/* Actions */}
                      {activeTab === 'pending' && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setNoteInputId(noteInputId === req._id ? null : req._id)}
                            disabled={!!actionId || bulkGenerating}
                            className={`p-1.5 rounded-xl transition-colors disabled:opacity-50 ${
                              noteInputId === req._id
                                ? 'bg-amber-100 text-amber-600'
                                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            }`}
                            title="Add note for AI"
                          >
                            <StickyNote className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleGenerate(req._id, member?.name || 'member')}
                            disabled={!!actionId || bulkGenerating}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-black text-[#00E676] text-[10px] font-black rounded-xl hover:bg-gray-900 disabled:opacity-50 transition-colors"
                          >
                            {isActioning ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {isActioning ? 'Generating' : 'Generate'}
                          </button>
                          <button
                            onClick={() => handleDismiss(req._id)}
                            disabled={!!actionId || bulkGenerating}
                            className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 transition-colors"
                            aria-label="Dismiss"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline note input for this request */}
                    {activeTab === 'pending' && noteInputId === req._id && (
                      <div className="flex gap-2 pt-1 border-t border-gray-50">
                        <textarea
                          rows={2}
                          value={noteValues[req._id] || ''}
                          onChange={e => setNoteValues(prev => ({ ...prev, [req._id]: e.target.value }))}
                          placeholder="Note for AI — e.g. focus on upper body, avoid dairy, low intensity this week…"
                          className="flex-1 px-3 py-2 border-2 border-amber-200 rounded-xl text-xs font-medium focus:border-amber-400 focus:outline-none resize-none bg-amber-50 placeholder-amber-400"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
