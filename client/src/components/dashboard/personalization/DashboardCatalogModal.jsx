/**
 * client/src/components/dashboard/personalization/DashboardCatalogModal.jsx
 *
 * Internal Dashboard Catalog Marketplace Modal:
 * - Filter by Categories (Executive, Finance, Operations, Maintenance, Leasing)
 * - Display ratings (★ 4.8) and usage counts (152 uses)
 * - Immutable Template Application trigger
 */

import React, { useState } from 'react';

const CATEGORIES = [
  { id: 'all', label: 'All Catalog' },
  { id: 'executive', label: 'Executive' },
  { id: 'finance', label: 'Finance & Revenue' },
  { id: 'operations', label: 'Operations & Latency' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'leasing', label: 'Leasing & Occupancy' }
];

export default function DashboardCatalogModal({
  isOpen = false,
  onClose,
  templates = [],
  onApplyTemplate
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/90">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30 text-sm">
                🏛️
              </span>
              Dashboard Catalog Marketplace
            </h2>
            <p className="text-xs text-slate-400 mt-1">Browse pre-packaged organizational templates & department layouts.</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search & Category Tabs */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search templates by title, metrics, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 text-slate-200 text-sm rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-500"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-2 p-12 text-center text-slate-400">
              <p>No matching catalog templates found.</p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div
                key={template._id || template.id}
                className="p-5 bg-slate-800/60 rounded-xl border border-slate-700/70 hover:border-indigo-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {template.category || 'Executive'}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
                      <span>★ {template.rating || 5.0}</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-400">{template.usageCount || 0} uses</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-white text-base">{template.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{template.description || 'Pre-configured department dashboard.'}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {template.widgets?.length || 0} Widgets Included
                  </span>
                  <button
                    onClick={() => onApplyTemplate(template)}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-md shadow-indigo-600/20"
                  >
                    Apply Template
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
