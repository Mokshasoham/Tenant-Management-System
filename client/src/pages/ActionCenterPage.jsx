import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Search, Filter, Calendar, List, Clock, Eye, Check, Trash2, 
  Archive, AlertCircle, CheckCircle2, ChevronRight, X, ArrowLeft, 
  Download, Printer, Share2, ClipboardList, CreditCard, RefreshCw, 
  DoorOpen, ClipboardCheck, Wrench, FileUp, MessageSquare, Megaphone, 
  ShieldCheck, HelpCircle, ArrowUpRight
} from 'lucide-react';
import { notificationService } from '../services/api';
import { useActionCenterNavigation } from '../hooks/useActionCenterNavigation';
import { cn } from '../utils/cn';

// Mapping categories to premium colors, badges, and icons
export const CATEGORY_CONFIG = {
  booking: { icon: ClipboardList, color: 'text-blue-400 border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20', label: 'Booking' },
  billing: { icon: ClipboardList, color: 'text-amber-400 border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20', label: 'Billing' },
  payments: { icon: CreditCard, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20', label: 'Payments' },
  lease: { icon: ShieldCheck, color: 'text-violet-400 border-violet-500/20 bg-violet-500/10 hover:bg-violet-500/20', label: 'Lease' },
  renewal: { icon: RefreshCw, color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20', label: 'Renewal' },
  'move-out': { icon: DoorOpen, color: 'text-rose-400 border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20', label: 'Move-Out' },
  inspection: { icon: ClipboardCheck, color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500/20', label: 'Inspection' },
  maintenance: { icon: Wrench, color: 'text-orange-400 border-orange-500/20 bg-orange-500/10 hover:bg-orange-500/20', label: 'Maintenance' },
  documents: { icon: FileUp, color: 'text-teal-400 border-teal-500/20 bg-teal-500/10 hover:bg-teal-500/20', label: 'Documents' },
  messages: { icon: MessageSquare, color: 'text-pink-400 border-pink-500/20 bg-pink-500/10 hover:bg-pink-500/20', label: 'Messages' },
  announcements: { icon: Megaphone, color: 'text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/10 hover:bg-fuchsia-500/20', label: 'Announcements' },
  security: { icon: ShieldCheck, color: 'text-red-400 border-red-500/20 bg-red-500/10 hover:bg-red-500/20', label: 'Security' },
  system: { icon: Bell, color: 'text-slate-400 border-slate-500/20 bg-slate-500/10 hover:bg-slate-500/20', label: 'System' }
};

export const PRIORITY_CONFIG = {
  critical: { label: 'Critical', bg: 'bg-red-500/10 text-red-400 border-red-500/20' },
  high: { label: 'High', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  medium: { label: 'Medium', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  low: { label: 'Low', bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
};

export const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400', glow: 'shadow-red-500/10' },
  warning: { color: 'text-yellow-400', glow: 'shadow-yellow-500/10' },
  success: { color: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
  information: { color: 'text-blue-400', glow: 'shadow-blue-500/10' }
};

export default function ActionCenterPage() {
  const { handleAction } = useActionCenterNavigation();

  // Layout View Toggles
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [calendarAgendas, setCalendarAgendas] = useState({});
  const [stats, setStats] = useState({ unreadCount: 0, criticalCount: 0, totalCount: 0, readRate: 0, averageResponseTimeMin: 0, categoryDistribution: [] });

  // Filter States
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'unread', 'archived'
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'yesterday', 'week'

  // Selected Date state for Calendar Focus
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Side Drawer state
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Search input focus ref
  const searchInputRef = useRef(null);

  // Keyboard navigation focus ref
  const [activeActivityIndex, setActiveActivityIndex] = useState(-1);

  // Fetch metrics and timeline on filter changes
  useEffect(() => {
    fetchData();
  }, [categoryFilter, priorityFilter, statusFilter, dateFilter]);

  // Initial stats call
  useEffect(() => {
    fetchStats();
    fetchCalendarEvents();
  }, []);

  // Synchronize background read states instantly
  useEffect(() => {
    const handleRead = (e) => {
      const { id } = e.detail;
      setActivities(prev => prev.map(a => a._id === id ? { ...a, isRead: true, read: true } : a));
      setStats(prev => ({ ...prev, unreadCount: Math.max(0, prev.unreadCount - 1) }));
    };
    window.addEventListener('notificationMarkedRead', handleRead);
    return () => window.removeEventListener('notificationMarkedRead', handleRead);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        limit: 100,
        category: categoryFilter,
        priority: priorityFilter,
      };

      if (statusFilter === 'unread') params.isRead = 'false';
      if (statusFilter === 'archived') params.isArchived = 'true';
      else params.isArchived = 'false';

      if (dateFilter === 'today') {
        const d = new Date();
        d.setHours(0,0,0,0);
        params.startDate = d.toISOString();
      } else if (dateFilter === 'yesterday') {
        const d1 = new Date(); d1.setDate(d1.getDate() - 1); d1.setHours(0,0,0,0);
        const d2 = new Date(); d2.setDate(d2.getDate() - 1); d2.setHours(23,59,59,999);
        params.startDate = d1.toISOString();
        params.endDate = d2.toISOString();
      } else if (dateFilter === 'week') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        params.startDate = d.toISOString();
      }

      const res = await notificationService.getV1Notifications(params);
      const items = res.data?.data || res.data || [];
      setActivities(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to load Action Center data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await notificationService.getEventStats();
      if (res.data?.success) setStats(res.data.data);
    } catch (_) {}
  };

  const fetchCalendarEvents = async () => {
    try {
      const res = await notificationService.getCalendarAgenda({});
      if (res.data?.success) {
        const grouped = {};
        res.data.data.forEach(item => {
          grouped[item.date] = item.events;
        });
        setCalendarAgendas(grouped);
      }
    } catch (_) {}
  };

  // Mark single item read
  const handleMarkRead = async (activity) => {
    if (activity.isRead) return;
    try {
      await notificationService.markV1Read(activity._id);
      setActivities(prev => prev.map(a => a._id === activity._id ? { ...a, isRead: true, read: true } : a));
      setStats(prev => ({ ...prev, unreadCount: Math.max(0, prev.unreadCount - 1) }));
    } catch (_) {}
  };

  // Mark all read
  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllV1Read();
      setActivities(prev => prev.map(a => ({ ...a, isRead: true, read: true })));
      setStats(prev => ({ ...prev, unreadCount: 0 }));
    } catch (_) {}
  };

  // Archive toggle
  const handleToggleArchive = async (activity) => {
    try {
      await notificationService.archiveNotification(activity._id);
      setActivities(prev => prev.filter(a => a._id !== activity._id));
      fetchStats();
    } catch (_) {}
  };

  // Soft delete
  const handleDelete = async (activity) => {
    try {
      await notificationService.deleteV1Notification(activity._id);
      setActivities(prev => prev.filter(a => a._id !== activity._id));
      fetchStats();
    } catch (_) {}
  };

  // Workflow dispatch trigger
  const handleContinuation = (activity) => {
    console.log('[ActionCenterPage] Workflow continuation / View Details clicked:', activity);
    handleAction(activity);
  };

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveActivityIndex(prev => Math.min(activities.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveActivityIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Enter' && activeActivityIndex >= 0) {
        e.preventDefault();
        const activity = activities[activeActivityIndex];
        setSelectedActivity(activity);
        setIsDrawerOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activities, activeActivityIndex]);

  // Group activities chronologically
  const getGroupedActivities = () => {
    const todayStr = new Date().toLocaleDateString();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString();

    const groups = {
      Today: [],
      Yesterday: [],
      Older: []
    };

    const filtered = activities.filter(act => {
      if (!search) return true;
      const lowerSearch = search.toLowerCase();
      return (
        act.title?.toLowerCase().includes(lowerSearch) ||
        act.message?.toLowerCase().includes(lowerSearch) ||
        act.eventId?.toLowerCase().includes(lowerSearch) ||
        act.metadata?.bookingNumber?.toLowerCase().includes(lowerSearch) ||
        act.metadata?.invoiceNumber?.toLowerCase().includes(lowerSearch)
      );
    });

    // If a specific calendar date is selected, restrict timeline to that date
    const targetDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : null;

    filtered.forEach(act => {
      const actDate = new Date(act.createdAt);
      const actDateStr = actDate.toISOString().split('T')[0];

      if (targetDateStr && actDateStr !== targetDateStr) return;

      const localDateStr = actDate.toLocaleDateString();
      if (localDateStr === todayStr) {
        groups.Today.push(act);
      } else if (localDateStr === yesterdayStr) {
        groups.Yesterday.push(act);
      } else {
        groups.Older.push(act);
      }
    });

    return groups;
  };

  const groupedActivities = getGroupedActivities();
  const totalDisplayCount = Object.values(groupedActivities).reduce((a, b) => a + b.length, 0);

  // Render Calendar Month Grid
  const renderCalendarDays = () => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const days = [];

    // Padding for starting weekday offset
    const startOffset = start.getDay();
    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`pad-${i}`} className="h-9 w-full bg-card/20 rounded-md border border-border/10 opacity-20" />);
    }

    // Days list
    const monthLength = end.getDate();
    for (let d = 1; d <= monthLength; d++) {
      const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
      const dateKey = dateObj.toISOString().split('T')[0];
      const dayEvents = calendarAgendas[dateKey] || [];

      const isToday = dateObj.toLocaleDateString() === new Date().toLocaleDateString();
      const isSelected = selectedDate && dateObj.toLocaleDateString() === selectedDate.toLocaleDateString();

      // Collect count of unique categories or high-severity states
      const hasCritical = dayEvents.some(e => e.severity === 'critical');
      const hasWarning = dayEvents.some(e => e.severity === 'warning');

      days.push(
        <button
          key={`day-${d}`}
          onClick={() => {
            setSelectedDate(isSelected ? null : dateObj);
            setViewMode('list');
          }}
          className={cn(
            "h-10 w-full relative flex flex-col items-center justify-center rounded-xl border text-[11px] font-black font-mono transition-all duration-200 hover:scale-105 hover:bg-muted/80 cursor-pointer",
            isToday && "border-emerald-500 text-emerald-500",
            isSelected ? "bg-emerald-500 border-emerald-600 text-slate-900 shadow-md shadow-emerald-500/20" : "bg-card border-border/30 text-muted-foreground",
            !isSelected && dayEvents.length > 0 && "text-foreground font-black"
          )}
        >
          {d}
          {dayEvents.length > 0 && (
            <div className="absolute bottom-1 flex gap-0.5 justify-center">
              {hasCritical ? (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              ) : hasWarning ? (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </div>
          )}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6">
      
      {/* Top Banner Stats Summary Section */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <span className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </span>
            Enterprise Action Center
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Communication & automated operations control tower.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <div className="bg-card border border-border/40 rounded-xl px-4 py-2 text-center shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground/60 block uppercase">Unread Tasks</span>
            <span className="text-lg font-black text-foreground font-mono">{stats.unreadCount}</span>
          </div>
          <div className="bg-card border border-border/40 rounded-xl px-4 py-2 text-center shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground/60 block uppercase">Critical Alerts</span>
            <span className="text-lg font-black text-red-500 font-mono">{stats.criticalCount}</span>
          </div>
          <div className="bg-card border border-border/40 rounded-xl px-4 py-2 text-center shadow-sm">
            <span className="text-[10px] font-bold text-muted-foreground/60 block uppercase">Task Read Rate</span>
            <span className="text-lg font-black text-emerald-400 font-mono">{stats.readRate}%</span>
          </div>
          <button 
            onClick={handleMarkAllRead} 
            disabled={stats.unreadCount === 0}
            className="flex items-center gap-1.5 px-4 bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/15 hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Main Grid: Left Timeline (70%), Right Calendar Agenda Widgets (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* Left Column: Search Filters + Activity Feed */}
        <div className="lg:col-span-7 space-y-6">

          {/* Search bar & filter pill bar */}
          <div className="bg-card border border-border/30 rounded-2xl p-4 shadow-sm space-y-4">
            
            {/* Search Input */}
            <div className="relative group flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-muted-foreground/40 group-focus-within:text-emerald-500 transition-colors" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, booking IDs, invoice numbers, keyword or property..."
                className="w-full bg-muted border border-border/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
              />
            </div>

            {/* Quick Filters Row */}
            <div className="flex flex-wrap items-center gap-3 text-xs border-t border-border/10 pt-3">
              <div className="flex items-center gap-1 bg-muted/60 border border-border/20 rounded-lg px-2.5 py-1 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5" />
                Category
              </div>
              
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-card border border-border/40 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">All Modules</option>
                {Object.keys(CATEGORY_CONFIG).map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].label}</option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-card border border-border/40 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-card border border-border/40 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">Timeline Feed</option>
                <option value="unread">Unread Actions</option>
                <option value="archived">Archived Log</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-card border border-border/40 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none cursor-pointer border-r"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Past Week</option>
              </select>

              {/* Reset constraints */}
              {(categoryFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all' || selectedDate) && (
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setPriorityFilter('all');
                    setStatusFilter('all');
                    setDateFilter('all');
                    setSelectedDate(null);
                  }}
                  className="text-red-400 hover:text-red-300 font-bold ml-auto cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Connected timeline feed */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-card border border-border/30 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : totalDisplayCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-card border border-dashed border-border/30 rounded-3xl text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <h3 className="text-base font-black text-foreground">Timeline Agenda Empty</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-2">
                No actionable events match current filter conditions.
              </p>
            </div>
          ) : (
            <div className="space-y-8 relative pl-4 before:absolute before:left-8 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/30">
              {Object.keys(groupedActivities).map(groupName => {
                const groupEvents = groupedActivities[groupName];
                if (groupEvents.length === 0) return null;

                return (
                  <div key={groupName} className="space-y-6">
                    
                    {/* Header Group Date */}
                    <div className="relative flex items-center">
                      <div className="absolute -left-[29px] w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-[10px] font-black text-muted-foreground z-10">
                        •
                      </div>
                      <span className="text-xs font-black text-foreground/80 tracking-wider uppercase bg-muted/80 px-3 py-1 rounded-md border border-border/40">
                        {groupName}
                      </span>
                    </div>

                    {/* Timeline Elements */}
                    <div className="space-y-4">
                      {groupEvents.map((activity, idx) => {
                        const isSelected = activeActivityIndex === idx;
                        const config = CATEGORY_CONFIG[activity.category] || CATEGORY_CONFIG.system;
                        const CatIcon = config.icon;
                        const severity = SEVERITY_CONFIG[activity.severity] || SEVERITY_CONFIG.information;

                        // Check workflow step details
                        const isActionable = activity.action && activity.action !== 'view';

                        return (
                          <motion.div
                            key={activity._id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => {
                              setSelectedActivity(activity);
                              setIsDrawerOpen(true);
                            }}
                            className={cn(
                              "relative bg-card border rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer flex flex-col md:flex-row gap-4 justify-between items-start md:items-center",
                              activity.isRead ? "border-border/30 opacity-75" : "border-emerald-500/20 shadow-emerald-500/[0.02]",
                              isSelected && "ring-2 ring-emerald-500/40"
                            )}
                          >
                            {/* Inner Circle Connected to timeline rod */}
                            <div className="absolute -left-[27px] top-7 w-2 h-2 rounded-full bg-card border border-border z-10 group-hover:bg-emerald-400 group-hover:border-emerald-500 transition-colors" />

                            <div className="flex gap-4 items-start flex-1 min-w-0">
                              
                              {/* Category Icon */}
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-xs shrink-0 transition-transform group-hover:scale-105",
                                config.color
                              )}>
                                <CatIcon className="w-5 h-5" />
                              </div>

                              <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[9px] font-black tracking-wider text-muted-foreground/60 font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border/10">
                                    {activity.eventId}
                                  </span>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider",
                                    PRIORITY_CONFIG[activity.priority]?.bg || PRIORITY_CONFIG.medium.bg
                                  )}>
                                    {activity.priority}
                                  </span>
                                  {!activity.isRead && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="New Activity" />
                                  )}
                                </div>

                                <h3 className={cn(
                                  "text-sm tracking-tight text-foreground",
                                  activity.isRead ? "font-bold" : "font-black"
                                )}>
                                  {activity.title}
                                </h3>

                                <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl">
                                  {activity.description || activity.message}
                                </p>

                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50 pt-1.5">
                                  <span className="flex items-center gap-1 font-mono">
                                    <Clock className="w-3.5 h-3.5" />
                                    {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span>·</span>
                                  <span>Module: {activity.sourceModule}</span>
                                </div>
                              </div>
                            </div>

                            {/* Actions Column */}
                            <div className="flex items-center gap-2 self-stretch md:self-auto justify-end border-t border-border/10 pt-3.5 md:border-t-0 md:pt-0 shrink-0">
                              
                              {/* Workflow Primary Button */}
                              {isActionable ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleContinuation(activity);
                                  }}
                                  className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  {activity.action.toUpperCase()}
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkRead(activity);
                                  }}
                                  disabled={activity.isRead}
                                  className="p-2 rounded-xl border border-border/30 hover:bg-muted text-muted-foreground/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                  title="Mark as Read"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleArchive(activity);
                                }}
                                className="p-2 rounded-xl border border-border/30 hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-all cursor-pointer"
                                title="Archive Activity"
                              >
                                <Archive className="w-4 h-4" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(activity);
                                }}
                                className="p-2 rounded-xl border border-border/30 hover:bg-red-500/5 text-muted-foreground/60 hover:text-red-400 transition-all cursor-pointer"
                                title="Delete Inbox Notification"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Mini Calendar & Stats */}
        <div className="lg:col-span-3 space-y-6">

          {/* Smart Monthly Calendar Widget */}
          <div className="bg-card border border-border/30 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/10 pb-2">
              <span className="text-xs font-black uppercase text-foreground tracking-wider flex items-center gap-1">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Event Calendar
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="p-1 rounded bg-muted/60 border border-border/20 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="p-1 rounded bg-muted/60 border border-border/20 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-center font-bold font-mono text-xs uppercase text-foreground">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-[10px] text-center font-black text-muted-foreground/40">
              {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(d => (
                <div key={d} className="h-6 flex items-center justify-center">{d}</div>
              ))}
            </div>

            {/* Monthly Grid */}
            <div className="grid grid-cols-7 gap-1">
              {renderCalendarDays()}
            </div>

            {selectedDate && (
              <div className="border-t border-border/10 pt-3 flex items-center justify-between text-[11px] text-emerald-500 font-bold">
                <span>Filter: {selectedDate.toLocaleDateString()}</span>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="text-muted-foreground hover:text-foreground font-black cursor-pointer"
                >
                  Show All
                </button>
              </div>
            )}
          </div>

          {/* Daily Agenda view when selected */}
          {selectedDate && (
            <div className="bg-card border border-border/30 rounded-2xl p-4 shadow-sm space-y-3">
              <span className="text-xs font-black uppercase text-foreground tracking-wider block border-b border-border/10 pb-2">
                Daily Agenda Log
              </span>
              
              {(() => {
                const dateKey = selectedDate.toISOString().split('T')[0];
                const dayEvents = calendarAgendas[dateKey] || [];
                if (dayEvents.length === 0) {
                  return <p className="text-[11px] text-muted-foreground italic">No historical timeline logs recorded for this day.</p>;
                }

                return (
                  <div className="space-y-3">
                    {dayEvents.map(evt => {
                      const iconConfig = CATEGORY_CONFIG[evt.category] || CATEGORY_CONFIG.system;
                      const Icon = iconConfig.icon;
                      return (
                        <div 
                          key={evt._id} 
                          onClick={() => {
                            setSelectedActivity(evt);
                            setIsDrawerOpen(true);
                          }}
                          className="flex gap-2.5 items-start text-xs border-b border-border/5 pb-2 last:border-0 last:pb-0 hover:bg-muted/30 p-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <span className={cn("p-1 rounded bg-muted shrink-0 text-foreground/75", iconConfig.color)}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{evt.title}</p>
                            <p className="text-[9px] text-muted-foreground/60 font-mono">
                              {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Stats Distribution Card */}
          <div className="bg-card border border-border/30 rounded-2xl p-4 shadow-sm space-y-4">
            <span className="text-xs font-black uppercase text-foreground tracking-wider block border-b border-border/10 pb-2">
              Category Distribution
            </span>
            <div className="space-y-2">
              {stats.categoryDistribution?.map(dist => {
                const config = CATEGORY_CONFIG[dist.category] || CATEGORY_CONFIG.system;
                return (
                  <div key={dist.category} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5 capitalize">
                      <span className={cn("w-2 h-2 rounded-full", config.color?.split(' ')[0])} />
                      {dist.category}
                    </span>
                    <span className="font-black text-foreground font-mono bg-muted px-2 py-0.5 rounded border border-border/10">
                      {dist.count}
                    </span>
                  </div>
                );
              })}
              {(!stats.categoryDistribution || stats.categoryDistribution.length === 0) && (
                <p className="text-xs text-muted-foreground italic">No historical stats distributions loaded.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Details Slide-out Sidebar Drawer */}
      <AnimatePresence>
        {isDrawerOpen && selectedActivity && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            
            {/* Backdrop cover */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Sidebar drawer body */}
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-screen max-w-md bg-card border-l border-border/30 shadow-2xl p-6 flex flex-col justify-between"
              >
                <div className="space-y-6 overflow-y-auto max-h-[85vh]">
                  
                  {/* Drawer Header */}
                  <div className="flex items-start justify-between border-b border-border/10 pb-4">
                    <div>
                      <span className="text-[10px] font-black text-emerald-400 font-mono tracking-widest block uppercase">
                        {selectedActivity.eventId}
                      </span>
                      <h2 className="text-lg font-black text-foreground mt-0.5 uppercase tracking-tight">
                        {selectedActivity.title}
                      </h2>
                      <span className="text-[10px] text-muted-foreground/60 font-mono">
                        Logged on: {new Date(selectedActivity.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Core Details body */}
                  <div className="space-y-4">
                    
                    {/* Category config pill */}
                    <div className="flex gap-2">
                      <span className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider",
                        CATEGORY_CONFIG[selectedActivity.category]?.color || CATEGORY_CONFIG.system.color
                      )}>
                        {selectedActivity.category}
                      </span>
                      <span className={cn(
                        "px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider",
                        PRIORITY_CONFIG[selectedActivity.priority]?.bg || PRIORITY_CONFIG.medium.bg
                      )}>
                        {selectedActivity.priority}
                      </span>
                    </div>

                    <div className="bg-muted/40 border border-border/30 rounded-xl p-4 space-y-3">
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase block">Event Description</span>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {selectedActivity.description || selectedActivity.message}
                      </p>
                    </div>

                    {/* Metadata Context mapping */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase block">Workflow Context</span>
                      <div className="bg-muted/40 border border-border/30 rounded-xl p-3.5 space-y-2.5 text-xs">
                        <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                          <span className="text-muted-foreground/60">Source Module</span>
                          <span className="font-bold capitalize text-foreground">{selectedActivity.sourceModule || 'system'}</span>
                        </div>
                        {selectedActivity.metadata?.bookingNumber && (
                          <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                            <span className="text-muted-foreground/60">Booking Reference</span>
                            <span className="font-bold font-mono text-foreground">{selectedActivity.metadata.bookingNumber}</span>
                          </div>
                        )}
                        {selectedActivity.metadata?.invoiceNumber && (
                          <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                            <span className="text-muted-foreground/60">Invoice Number</span>
                            <span className="font-bold font-mono text-foreground">{selectedActivity.metadata.invoiceNumber}</span>
                          </div>
                        )}
                        {selectedActivity.metadata?.leaseNumber && (
                          <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                            <span className="text-muted-foreground/60">Lease Reference</span>
                            <span className="font-bold font-mono text-foreground">{selectedActivity.metadata.leaseNumber}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground/60">Action Category</span>
                          <span className="font-bold text-foreground font-mono uppercase text-[10px] bg-muted/90 px-2 py-0.5 rounded border border-border/20">{selectedActivity.action}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action buttons */}
                <div className="border-t border-border/10 pt-4 flex gap-3 shrink-0">
                  {selectedActivity.action && selectedActivity.action !== 'view' ? (
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        handleContinuation(selectedActivity);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      CONTINUE {selectedActivity.action.toUpperCase()} WORKFLOW
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  ) : (selectedActivity.redirectUrl || selectedActivity.link || selectedActivity.entityId || selectedActivity.relatedId) ? (
                    <>
                      <button
                        onClick={() => setIsDrawerOpen(false)}
                        className="flex-1 py-3 rounded-xl border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-black transition-all cursor-pointer"
                      >
                        CLOSE
                      </button>
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          handleContinuation(selectedActivity);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                      >
                        VIEW DETAILS
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-black transition-all cursor-pointer"
                    >
                      CLOSE AGENDAS
                    </button>
                  )}
                </div>

              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
