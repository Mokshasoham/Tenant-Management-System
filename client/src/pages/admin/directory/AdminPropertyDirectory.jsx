import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, MapPin, Building2, Home, Square, LayoutGrid, Map, SlidersHorizontal,
  Plus, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Download, Pin, Star,
  RotateCcw, History, Lock, FileSpreadsheet, FileText, Scale
} from 'lucide-react';
import { VerificationPageHeader, VerificationSectionCard } from '../../../components/verification';

import getVerificationMapper from '../../../mappers/verificationMapperFactory';
import adminPropertyDirectoryMapper from '../../../mappers/adminPropertyDirectoryMapper';
import trackEvent, { VERIFICATION_EVENTS } from '../../../utils/verificationAnalytics';

import SmartAlertsBar from './components/SmartAlertsBar';
import ReviewerWorkloadBar from './components/ReviewerWorkloadBar';
import RiskOverviewBar from './components/RiskOverviewBar';
import BulkActionsToolbar from './components/BulkActionsToolbar';
import PropertyGridView from './components/PropertyGridView';
import PropertyMapView from './components/PropertyMapView';
import PropertyInspectionModal from './components/PropertyInspectionModal';
import PropertyComparisonModal from './components/PropertyComparisonModal';
import ManagerPortfolioPopover from './components/ManagerPortfolioPopover';
import RelatedPropertiesDrawer from './components/RelatedPropertiesDrawer';

const CATEGORIES = [
  { key: 'all', label: 'All Categories' },
  { key: 'apartment', label: 'Apartments' },
  { key: 'house', label: 'Houses' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'land', label: 'Land' },
];

export default function AdminPropertyDirectory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Load preferences from localStorage
  const savedPrefs = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('admin_dir_prefs')) || {}; }
    catch { return {}; }
  }, []);

  const [viewMode, setViewMode] = useState(savedPrefs.viewMode || 'grid'); // 'grid' | 'map'
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('type') || 'all');
  const [cityFilter, setCityFilter] = useState(searchParams.get('city') || 'ALL');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [riskFilter, setRiskFilter] = useState(searchParams.get('risk') || 'ALL');
  const [sortOption, setSortOption] = useState(savedPrefs.sort || 'newest');

  // State Datasets
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState(null);
  const [riskSummary, setRiskSummary] = useState({});
  const [workload, setWorkload] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);

  // Selection & Modals
  const [selectedIds, setSelectedIds] = useState([]);
  const [inspectingPropertyId, setInspectingPropertyId] = useState(null);
  const [comparingIds, setComparingIds] = useState([]);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [relatedDrawerProperty, setRelatedDrawerProperty] = useState(null);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    const rawProperties = adminPropertyDirectoryMapper.mapDirectoryProperties(null);
    setProperties(rawProperties);
    setStats(adminPropertyDirectoryMapper.mapStats(null));
    setRiskSummary(adminPropertyDirectoryMapper.mapRiskSummary(null));
    setWorkload(adminPropertyDirectoryMapper.mapWorkload(null));
    setAlerts(adminPropertyDirectoryMapper.mapSmartAlerts(null));
    setSavedSearches(adminPropertyDirectoryMapper.mapSavedSearches(null));

    trackEvent(VERIFICATION_EVENTS.ADMIN_DETAILS_OPEN, { page: 'property_directory' });
  }, []);

  // Save Preferences to LocalStorage & URL Params
  useEffect(() => {
    localStorage.setItem('admin_dir_prefs', JSON.stringify({ viewMode, sort: sortOption }));

    const params = {};
    if (searchQuery) params.search = searchQuery;
    if (categoryFilter !== 'all') params.type = categoryFilter;
    if (cityFilter !== 'ALL') params.city = cityFilter;
    if (statusFilter !== 'ALL') params.status = statusFilter;
    if (riskFilter !== 'ALL') params.risk = riskFilter;
    setSearchParams(params, { replace: true });
  }, [viewMode, searchQuery, categoryFilter, cityFilter, statusFilter, riskFilter, sortOption]);

  // Handle Inspection
  const handleInspect = (id) => {
    setInspectingPropertyId(id);
    const found = properties.find((p) => p.id === id);
    if (found) {
      setRecentlyViewed((prev) => [found, ...prev.filter((p) => p.id !== id)].slice(0, 5));
    }
  };

  // Toggle Comparison Selection
  const handleToggleCompare = (id) => {
    setComparingIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Checkbox Select Toggle
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Filtered Properties Logic
  const filteredProperties = properties.filter((p) => {
    if (categoryFilter !== 'all' && p.type !== categoryFilter) return false;
    if (cityFilter !== 'ALL' && p.city !== cityFilter) return false;
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (riskFilter !== 'ALL' && p.verificationPriority !== riskFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.propertyId.toLowerCase().includes(q) ||
        p.managerName.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const inspectedPropertyObj = properties.find((p) => p.id === inspectingPropertyId);
  const comparingPropertiesObj = properties.filter((p) => comparingIds.includes(p.id));

  return (
    <div className="p-6 sm:p-10 space-y-8">
      {/* Header Bar */}
      <VerificationPageHeader
        title="Enterprise Property Directory"
        subtitle="GIS directory management across portfolio properties with Triple Metrics (Trust, Health, Compliance), inspection tools, and bulk actions"
        icon={Building2}
        actionText="Compare Selected"
        onAction={() => setComparisonModalOpen(true)}
      />

      {/* Collapsible Smart Alerts & KPIs Bar */}
      <SmartAlertsBar alerts={alerts} onSelectFilter={(fKey) => alert(`Filtered queue by: ${fKey}`)} />
      <RiskOverviewBar riskSummary={riskSummary} onSelectRisk={(rKey) => setRiskFilter(rKey)} />
      <ReviewerWorkloadBar reviewers={workload} onSelectReviewer={(rName) => alert(`Filtered tasks for ${rName}`)} />

      {/* Preserved Filter Toolbar (Search Bar, Category Chips, City Selector, Grid/Map Toggle) */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="md:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Property Name, ID, Manager, Owner, City, PIN..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* City Selector */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Cities</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Visakhapatnam">Visakhapatnam</option>
            <option value="Bangalore">Bangalore</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="newest">Newest First</option>
            <option value="trust_desc">Trust Score (High → Low)</option>
            <option value="rent_asc">Rent (Low → High)</option>
            <option value="rent_desc">Rent (High → Low)</option>
          </select>

          {/* Grid / Map Toggle Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grid
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                viewMode === 'map' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Map className="w-3.5 h-3.5" /> GIS Map
            </button>
          </div>
        </div>

        {/* Category Chips Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === cat.key
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedIds.length}
        onAction={(act) => alert(`Bulk Action triggered: ${act} for ${selectedIds.length} properties`)}
      />

      {/* Main Directory Display View (Grid or Map) */}
      {viewMode === 'grid' ? (
        <PropertyGridView
          properties={filteredProperties}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onInspect={handleInspect}
          onOpenManager={(mgr) => setSelectedManager(mgr)}
        />
      ) : (
        <PropertyMapView properties={filteredProperties} onInspect={handleInspect} />
      )}

      {/* Modals & Popovers */}
      <PropertyInspectionModal
        property={inspectedPropertyObj}
        isOpen={Boolean(inspectingPropertyId)}
        onClose={() => setInspectingPropertyId(null)}
      />

      <PropertyComparisonModal
        properties={comparingPropertiesObj}
        isOpen={comparisonModalOpen}
        onClose={() => setComparisonModalOpen(false)}
      />

      <ManagerPortfolioPopover manager={selectedManager} onClose={() => setSelectedManager(null)} />

      <RelatedPropertiesDrawer
        property={relatedDrawerProperty}
        isOpen={Boolean(relatedDrawerProperty)}
        onClose={() => setRelatedDrawerProperty(null)}
        onInspect={handleInspect}
      />
    </div>
  );
}
