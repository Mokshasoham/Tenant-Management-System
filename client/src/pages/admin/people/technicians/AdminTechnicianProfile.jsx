import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench, RefreshCw } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { cn } from '../../../../utils/cn';
import { userService } from '../../../../services/api';

export default function AdminTechnicianProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [tech, setTech] = useState(null);

  useEffect(() => {
    fetchTech();
  }, [id]);

  const fetchTech = async () => {
    setLoading(true);
    try {
      const rawId = id?.replace(/^TECH-/, '');
      const res = await userService.getUserById(rawId || id);
      const data = res?.data || res;
      setTech(data);
    } catch (err) {
      console.error('Error fetching technician details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center text-muted-foreground">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mr-2" />
        <span>Loading technician profile...</span>
      </div>
    );
  }

  const name = tech ? `${tech.firstName || ''} ${tech.lastName || ''}`.trim() : 'Technician';

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans transition-colors",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      <button
        onClick={() => navigate('/admin/people/technicians')}
        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Technicians Directory
      </button>

      <div className={cn(
        "p-6 rounded-[2.25rem] border shadow-2xl space-y-4 backdrop-blur-2xl transition-all",
        theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center text-xl shadow-lg">
              {tech?.firstName?.charAt(0) || 'T'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ● Field Technician
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                ID: {tech?._id} · {tech?.email} · {tech?.phone || 'No phone'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
