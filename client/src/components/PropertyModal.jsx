import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../services/api';
import { 
  X, UploadCloud, MapPin, XCircle, Video, Image as ImageIcon, Loader2, 
  CheckCircle2, Navigation, Layers, Compass, Sparkles, MoveLeft, MoveRight, 
  Eye, Globe, Shield, Star, Info, ArrowRight, Check
} from 'lucide-react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { useDropzone } from 'react-dropzone';
import { cn } from '../utils/cn';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Default Icon Assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Singapore',
  'United Arab Emirates', 'Saudi Arabia', 'Germany', 'France', 'Netherlands',
  'Japan', 'China', 'South Korea', 'Malaysia', 'Thailand', 'Bangladesh',
  'Pakistan', 'Sri Lanka', 'Nepal', 'Spain', 'Italy', 'Sweden', 'Switzerland',
  'New Zealand', 'South Africa', 'Nigeria', 'Kenya', 'Brazil', 'Mexico',
];

const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const COMMON_AMENITIES = [
  'Parking', 'Wifi', 'Pool', 'Gym', 'Laundry', 'AC',
  'Furnished', 'Maintenance', 'Security', 'Balcony', 'Power Backup', 'Elevator'
];

const COORDS_MAP = {
  'Andhra Pradesh': { lat: 15.9129, lng: 79.7400 },
  'Arunachal Pradesh': { lat: 28.2180, lng: 94.7278 },
  'Assam': { lat: 26.2006, lng: 92.9376 },
  'Bihar': { lat: 25.0961, lng: 85.3131 },
  'Chhattisgarh': { lat: 21.2787, lng: 81.8661 },
  'Goa': { lat: 15.2993, lng: 74.1240 },
  'Gujarat': { lat: 22.2587, lng: 71.1924 },
  'Haryana': { lat: 29.0588, lng: 76.0856 },
  'Himachal Pradesh': { lat: 31.1048, lng: 77.1734 },
  'Jharkhand': { lat: 23.6102, lng: 85.2799 },
  'Karnataka': { lat: 15.3173, lng: 75.7139 },
  'Kerala': { lat: 10.8505, lng: 76.2711 },
  'Madhya Pradesh': { lat: 22.9734, lng: 78.6569 },
  'Maharashtra': { lat: 19.7515, lng: 75.7139 },
  'Manipur': { lat: 24.6637, lng: 93.9063 },
  'Meghalaya': { lat: 25.4670, lng: 91.3662 },
  'Mizoram': { lat: 23.1645, lng: 92.9376 },
  'Nagaland': { lat: 26.1584, lng: 94.5624 },
  'Odisha': { lat: 20.9517, lng: 85.0985 },
  'Punjab': { lat: 31.1471, lng: 75.3412 },
  'Rajasthan': { lat: 27.0238, lng: 74.2179 },
  'Sikkim': { lat: 27.5330, lng: 88.5122 },
  'Tamil Nadu': { lat: 11.1271, lng: 78.6569 },
  'Telangana': { lat: 18.1124, lng: 79.0193 },
  'Tripura': { lat: 23.9408, lng: 91.9882 },
  'Uttar Pradesh': { lat: 26.8467, lng: 80.9462 },
  'Uttarakhand': { lat: 30.0668, lng: 79.0193 },
  'West Bengal': { lat: 22.9868, lng: 87.8550 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  'Chandigarh': { lat: 30.7333, lng: 76.7794 },
  'Jammu & Kashmir': { lat: 33.7782, lng: 76.5762 },
  'Puducherry': { lat: 11.9416, lng: 79.8083 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Bengaluru': { lat: 12.9716, lng: 77.5946 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 },
  'Ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'Jaipur': { lat: 26.9124, lng: 75.7873 },
  'Pune': { lat: 18.5204, lng: 73.8567 }
};

const EMPTY_FORM = {
  name: '', address: '', city: '', state: '', zipCode: '', country: 'India',
  type: 'apartment', bedrooms: '', bathrooms: '', squareFeet: '',
  rentAmount: '', depositAmount: '', description: '', notes: '',
  amenities: [], bookingType: 'paid', publishStatus: 'published',
  seoTitle: '', seoDescription: '', seoKeywords: '',
  ogTitle: '', ogDescription: '', virtualTourUrl: ''
};

const libraries = ['places'];

export default function PropertyModal({ property, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'details' | 'location' | 'media' | 'seo'
  const [form, setForm] = useState(() => {
    if (property) {
      return {
        ...property,
        amenities: Array.isArray(property.amenities) ? property.amenities : (property.amenities || '').split(',').map(a => a.trim()).filter(Boolean),
        bedrooms: property.bedrooms ?? '',
        bathrooms: property.bathrooms ?? '',
        squareFeet: property.squareFeet ?? '',
        depositAmount: property.depositAmount ?? '',
        bookingType: property.bookingType || 'paid',
        publishStatus: property.publishStatus || 'published',
        seoTitle: property.seo?.title || '',
        seoDescription: property.seo?.description || '',
        seoKeywords: property.seo?.keywords || '',
        ogTitle: property.openGraph?.title || '',
        ogDescription: property.openGraph?.description || '',
        virtualTourUrl: property.virtualTourUrl || '',
        location: property.location || { lat: 12.9716, lng: 77.5946 }
      };
    }
    return { ...EMPTY_FORM, location: { lat: 12.9716, lng: 77.5946 } };
  });

  const [mediaFiles, setMediaFiles] = useState([]); // Array of File objects with extra preview metadata
  const [coverIndex, setCoverIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [autocompleteInstance, setAutocompleteInstance] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'], 
      'video/*': ['.mp4', '.webm', '.mov'] 
    },
    maxSize: 25 * 1024 * 1024, // 25MB
    onDrop: acceptedFiles => {
      const newMedia = acceptedFiles.map(file => ({
        file,
        id: Math.random().toString(36).substring(7),
        preview: URL.createObjectURL(file),
        isVideo: file.type.startsWith('video/'),
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + 'MB'
      }));
      setMediaFiles(prev => [...prev, ...newMedia]);
    }
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Cleanup preview Object URLs on unmount
  useEffect(() => {
    return () => {
      mediaFiles.forEach(m => {
        if (m.preview) URL.revokeObjectURL(m.preview);
      });
    };
  }, [mediaFiles]);

  // Sync Leaflet map when Location tab is active
  useEffect(() => {
    if (activeTab !== 'location') return;

    const lat = Number(form.location?.lat) || 12.9716;
    const lng = Number(form.location?.lng) || 77.5946;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([lat, lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setForm(p => ({
            ...p,
            location: { lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) }
          }));
        });

        map.on('click', (e) => {
          const { lat: clickLat, lng: clickLng } = e.latlng;
          marker.setLatLng([clickLat, clickLng]);
          setForm(p => ({
            ...p,
            location: { lat: parseFloat(clickLat.toFixed(6)), lng: parseFloat(clickLng.toFixed(6)) }
          }));
        });

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([lat, lng]);
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setLatLng([lat, lng]);
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [activeTab, form.location?.lat, form.location?.lng]);

  const handleStateChange = (stateVal) => {
    setForm(p => {
      const updated = { ...p, state: stateVal };
      const coords = COORDS_MAP[stateVal];
      if (coords) {
        updated.location = coords;
      }
      return updated;
    });
  };

  const handleCityChange = (cityVal) => {
    setForm(p => {
      const updated = { ...p, city: cityVal };
      const match = Object.keys(COORDS_MAP).find(k => k.toLowerCase() === cityVal.trim().toLowerCase());
      if (match) {
        updated.location = COORDS_MAP[match];
      }
      return updated;
    });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGettingLocation(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setForm(p => ({
          ...p,
          location: { lat, lng }
        }));
        setGettingLocation(false);
      },
      (err) => {
        setError(`Unable to retrieve GPS location: ${err.message}`);
        setGettingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const toggleAmenity = (amenity) => {
    setForm(p => {
      const current = Array.isArray(p.amenities) ? p.amenities : [];
      if (current.includes(amenity)) {
        return { ...p, amenities: current.filter(a => a !== amenity) };
      } else {
        return { ...p, amenities: [...current, amenity] };
      }
    });
  };

  const moveMedia = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= mediaFiles.length) return;
    setMediaFiles(prev => {
      const updated = [...prev];
      const [item] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, item);
      return updated;
    });
    if (coverIndex === fromIndex) setCoverIndex(toIndex);
    else if (coverIndex === toIndex) setCoverIndex(fromIndex);
  };

  const removeMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    if (coverIndex === index) setCoverIndex(0);
    else if (coverIndex > index) setCoverIndex(c => c - 1);
  };

  const handleSubmit = async (e, forcedStatus = null) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setUploadProgress(10);

    try {
      // Validate Coordinates
      const latNum = Number(form.location?.lat);
      const lngNum = Number(form.location?.lng);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        throw new Error('Latitude must be a valid number between -90 and +90.');
      }
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        throw new Error('Longitude must be a valid number between -180 and +180.');
      }

      const statusToUse = forcedStatus || form.publishStatus || 'published';

      const payload = {
        ...form,
        publishStatus: statusToUse,
        rentAmount: Number(form.rentAmount),
        depositAmount: Number(form.depositAmount) || 0,
        bedrooms: Number(form.bedrooms) || 0,
        bathrooms: Number(form.bathrooms) || 0,
        squareFeet: Number(form.squareFeet) || 0,
        amenities: Array.isArray(form.amenities) ? form.amenities : [],
        location: { lat: latNum, lng: lngNum },
        seo: { title: form.seoTitle, description: form.seoDescription, keywords: form.seoKeywords },
        openGraph: { title: form.ogTitle, description: form.ogDescription }
      };

      let propertyId = property?._id;
      setUploadProgress(30);

      if (property) {
        await propertyService.updateProperty(propertyId, payload);
      } else {
        const res = await propertyService.createProperty(payload);
        propertyId = res.data._id;
      }

      setUploadProgress(50);

      // Handle Real File Uploads
      if (mediaFiles.length > 0) {
        try {
          const formData = new FormData();
          
          // Ensure Cover image is uploaded first so backend assigns it as primary
          const sortedFiles = [...mediaFiles];
          if (coverIndex >= 0 && coverIndex < sortedFiles.length) {
            const [coverItem] = sortedFiles.splice(coverIndex, 1);
            sortedFiles.unshift(coverItem);
          }

          sortedFiles.forEach(item => formData.append('media', item.file));
          setUploadProgress(75);
          await propertyService.uploadPropertyMedia(propertyId, formData);
        } catch (mediaErr) {
          console.error('Media upload error:', mediaErr);
          const mediaMsg = mediaErr?.message || mediaErr?.error || mediaErr?.response?.data?.message || (typeof mediaErr === 'string' ? mediaErr : 'Media upload failed');
          throw new Error(`Property details saved, but media upload failed: ${mediaMsg}`);
        }
      }

      setUploadProgress(100);
      setSuccessMessage(`Property ${property ? 'updated' : 'created & published'} successfully!`);
      
      setTimeout(() => {
        onSave();
      }, 800);

    } catch (err) {
      console.error('Property save error:', err);
      const errMsg = err?.message || err?.error || err?.response?.data?.message || (typeof err === 'string' ? err : 'Failed to save property.');
      setError(errMsg);
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const formattedGeoString = `${(Number(form.location?.lat) || 12.9716).toFixed(4)}, ${(Number(form.location?.lng) || 77.5946).toFixed(4)}`;

  const tabs = [
    { id: 'basic', label: '1. Basic Info', icon: Info },
    { id: 'details', label: '2. Details & Amenities', icon: Layers },
    { id: 'location', label: '3. Location & Map', icon: Compass },
    { id: 'media', label: '4. Media & 3D Tour', icon: ImageIcon },
    { id: 'seo', label: '5. SEO & Publish', icon: Globe }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-2xl overflow-hidden backdrop-blur-xl"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {property ? 'Edit Property Workspace' : 'Add New Real Estate Property'}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Enterprise Portfolio Management
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Header Bar */}
        <div className="flex items-center gap-1 sm:gap-2 px-6 sm:px-8 py-3 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 whitespace-nowrap cursor-pointer border",
                  isActive
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-md"
                    : "bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-black flex items-center gap-3">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-black flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: BASIC INFO */}
          {activeTab === 'basic' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Section 1 — Basic Information</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Core listing identification, pricing, and category parameters.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Property Name *" required value={form.name} onChange={v => set('name', v)} placeholder="e.g. Oceanfront Luxury Villa" />

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Property Type *</label>
                  <select value={form.type} onChange={e => set('type', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-primary">
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="villa">Villa</option>
                    <option value="studio">Studio</option>
                    <option value="commercial">Commercial</option>
                    <option value="land">Land</option>
                    <option value="room">Room</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Publish Status</label>
                  <select value={form.publishStatus} onChange={e => set('publishStatus', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-primary">
                    <option value="published">Published (Visible in Tenant Directory)</option>
                    <option value="draft">Draft (Private Portfolio Only)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Monthly Rent (₹) *" type="number" required value={form.rentAmount} onChange={v => set('rentAmount', v)} placeholder="e.g. 25000" />
                  <Field label="Security Deposit (₹)" type="number" value={form.depositAmount} onChange={v => set('depositAmount', v)} placeholder="e.g. 50000" />
                </div>
              </div>

              <TextAreaField label="Property Description" value={form.description} onChange={v => set('description', v)} placeholder="Highlight key residence features, floor level, view, accessibility..." />
            </motion.div>
          )}

          {/* TAB 2: DETAILS & AMENITIES */}
          {activeTab === 'details' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Section 2 — Specifications & Amenities</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Physical layout dimensions and included residential facilities.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Bedrooms" type="number" value={form.bedrooms} onChange={v => set('bedrooms', v)} placeholder="e.g. 3" />
                <Field label="Bathrooms" type="number" value={form.bathrooms} onChange={v => set('bathrooms', v)} placeholder="e.g. 2" />
                <Field label="Square Feet" type="number" value={form.squareFeet} onChange={v => set('squareFeet', v)} placeholder="e.g. 1450" />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Furnishing</label>
                  <select value={form.furnishing || 'unfurnished'} onChange={e => set('furnishing', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-primary">
                    <option value="unfurnished">Unfurnished</option>
                    <option value="semi-furnished">Semi-Furnished</option>
                    <option value="fully-furnished">Fully-Furnished</option>
                  </select>
                </div>
              </div>

              {/* Amenity Badges Selector */}
              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Select Amenity Tags</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_AMENITIES.map((item) => {
                    const isSelected = (form.amenities || []).includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleAmenity(item)}
                        className={cn(
                          "px-4 py-2 rounded-2xl text-xs font-black transition-all border flex items-center gap-1.5 cursor-pointer",
                          isSelected
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-md"
                            : "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: LOCATION & MAP */}
          {activeTab === 'location' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Section 3 — Geolocation & Interactive Map</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Search address or click on the interactive map to position the property pin.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Address Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Address (Search / Text) *</label>
                    {isLoaded ? (
                      <Autocomplete
                        onLoad={setAutocompleteInstance}
                        onPlaceChanged={() => {
                          if (autocompleteInstance) {
                            const place = autocompleteInstance.getPlace();
                            if (place.geometry) {
                              setForm(p => ({
                                ...p,
                                address: place.formatted_address || p.address,
                                location: { 
                                  lat: parseFloat(place.geometry.location.lat().toFixed(6)), 
                                  lng: parseFloat(place.geometry.location.lng().toFixed(6)) 
                                }
                              }));
                            }
                          }
                        }}
                      >
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="text" value={form.address} onChange={e => set('address', e.target.value)} required
                            placeholder="Search address or enter street..."
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-primary" />
                        </div>
                      </Autocomplete>
                    ) : (
                      <Field label="" required value={form.address} onChange={v => set('address', v)} placeholder="e.g. 123 Main Street" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Country *</label>
                      <select value={form.country} onChange={e => { set('country', e.target.value); set('state', ''); }}
                        className="w-full px-4 py-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none">
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">State *</label>
                      {form.country === 'India' ? (
                        <select value={form.state} onChange={e => handleStateChange(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none">
                          <option value="">Select State</option>
                          {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <input type="text" value={form.state} onChange={e => handleStateChange(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City" value={form.city} onChange={v => handleCityChange(v)} placeholder="e.g. Bengaluru" />
                    <Field label="ZIP / PIN Code" value={form.zipCode} onChange={v => set('zipCode', v)} placeholder="e.g. 560001" />
                  </div>

                  {/* Latitude / Longitude & GPS Trigger */}
                  <div className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">GPS Coordinates</span>
                      <button
                        type="button"
                        onClick={handleUseMyLocation}
                        disabled={gettingLocation}
                        className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-primary/20 transition-all cursor-pointer"
                      >
                        {gettingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                        {gettingLocation ? 'Locating...' : 'Use My Location'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Latitude" type="number" step="any" value={form.location?.lat ?? 12.9716}
                        onChange={v => setForm(p => ({ ...p, location: { ...(p.location || {}), lat: parseFloat(v) || 0 } }))} />
                      <Field label="Longitude" type="number" step="any" value={form.location?.lng ?? 77.5946}
                        onChange={v => setForm(p => ({ ...p, location: { ...(p.location || {}), lng: parseFloat(v) || 0 } }))} />
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Geo Coordinates:</span>
                      <span className="font-black text-emerald-500 dark:text-emerald-400">{formattedGeoString}</span>
                    </div>
                  </div>
                </div>

                {/* Leaflet Map Picker Panel */}
                <div className="flex flex-col h-[340px] sm:h-auto min-h-[320px] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-inner relative">
                  <div ref={mapContainerRef} className="w-full h-full z-0" />
                  <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-widest">
                    📍 Click map to place marker
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: MEDIA & 3D TOUR */}
          {activeTab === 'media' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Section 4 — Real Photos, Videos & 3D Virtual Tour</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Upload high-resolution property photos, HD video walkthroughs, or Matterport 3D links.</p>
              </div>

              {/* Drag & Drop Zone */}
              <div {...getRootProps()} className={cn(
                "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all backdrop-blur-sm",
                isDragActive 
                  ? "border-primary bg-primary/10 scale-[0.99]" 
                  : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-primary/50"
              )}>
                <input {...getInputProps()} />
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 border border-primary/20">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">Drag & drop photos & videos here, or click to browse</p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                  Supports JPG, PNG, WEBP, MP4, WEBM (Max 25MB per file)
                </p>
              </div>

              {/* Media Preview Grid */}
              {mediaFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Uploaded Media Staging ({mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''})
                    </span>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                      Cover: {mediaFiles[coverIndex]?.name || 'First Photo'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {mediaFiles.map((m, idx) => (
                      <div key={m.id} className={cn(
                        "relative group rounded-2xl overflow-hidden border bg-slate-100 dark:bg-slate-800 flex flex-col aspect-square justify-between p-2 shadow-sm transition-all",
                        coverIndex === idx ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-slate-200 dark:border-slate-700"
                      )}>
                        {m.isVideo ? (
                          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                            <Video className="w-8 h-8 text-primary animate-pulse" />
                          </div>
                        ) : (
                          <img src={m.preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        )}

                        {/* Top Badges */}
                        <div className="relative z-10 flex items-center justify-between w-full">
                          {coverIndex === idx && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest">
                              COVER
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[8px] font-bold ml-auto backdrop-blur-sm">
                            {m.isVideo ? 'VIDEO' : 'IMAGE'}
                          </span>
                        </div>

                        {/* Action Overlays */}
                        <div className="relative z-10 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 p-1 rounded-xl backdrop-blur-md">
                          <button
                            type="button"
                            onClick={() => setCoverIndex(idx)}
                            className="text-[8px] font-black uppercase tracking-widest text-emerald-400 hover:underline px-1"
                          >
                            Set Cover
                          </button>
                          <div className="flex items-center gap-1">
                            {idx > 0 && (
                              <button type="button" onClick={() => moveMedia(idx, idx - 1)} className="text-white p-1 hover:bg-white/20 rounded">
                                <MoveLeft className="w-3 h-3" />
                              </button>
                            )}
                            {idx < mediaFiles.length - 1 && (
                              <button type="button" onClick={() => moveMedia(idx, idx + 1)} className="text-white p-1 hover:bg-white/20 rounded">
                                <MoveRight className="w-3 h-3" />
                              </button>
                            )}
                            <button type="button" onClick={() => removeMedia(idx)} className="text-rose-400 p-1 hover:bg-rose-500/20 rounded">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Server Media Preview */}
              {property?.media?.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Existing Saved Media ({property.media.length})
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {property.media.map((m, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex-shrink-0 bg-slate-900">
                        {m.mediaType === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center text-primary">
                            <Video className="w-6 h-6" />
                          </div>
                        ) : (
                          <img src={m.url} className="w-full h-full object-cover" alt="" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3D Virtual Tour URL Input */}
              <Field 
                label="3D Virtual Tour URL (Matterport / Kuula / Polycam)" 
                value={form.virtualTourUrl} 
                onChange={v => set('virtualTourUrl', v)} 
                placeholder="https://my.matterport.com/show/?m=..." 
              />
            </motion.div>
          )}

          {/* TAB 5: SEO & PUBLISH */}
          {activeTab === 'seo' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Section 5 — Search Engine Meta & Final Submission</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Optimize search engine visibility and publish property listing.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Field label="SEO Title" value={form.seoTitle} onChange={v => set('seoTitle', v)} placeholder="Luxury 3BHK Apartment for Rent in Koramangala" />
                  <TextAreaField label="SEO Meta Description" value={form.seoDescription} onChange={v => set('seoDescription', v)} placeholder="Spacious 3 bedroom residence with modern amenities..." />
                  <Field label="SEO Keywords" value={form.seoKeywords} onChange={v => set('seoKeywords', v)} placeholder="real estate, rental apartment, bangalore, 3bhk" />
                </div>

                {/* Live Preview Summary Card */}
                <div className="p-6 rounded-3xl bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Listing Card Preview</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase">
                      {form.publishStatus}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-base font-black text-slate-900 dark:text-slate-100">{form.name || 'Untitled Property'}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {form.address || 'Location details pending'}
                    </p>
                    <p className="text-xl font-black text-emerald-500">₹{(Number(form.rentAmount) || 0).toLocaleString('en-IN')} <span className="text-xs text-slate-400 font-normal">/ month</span></p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
                    <span>📷 {mediaFiles.filter(m => !m.isVideo).length} Photos</span>
                    <span>•</span>
                    <span>▶ {mediaFiles.filter(m => m.isVideo).length} Videos</span>
                    <span>•</span>
                    <span>📍 {formattedGeoString}</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar during submit */}
              {loading && uploadProgress > 0 && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-black text-slate-500">
                    <span>Uploading Property Media & Details...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e, 'draft')}
              className="px-5 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e, 'published')}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs tracking-wide shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Processing Property...' : (property ? 'Save Changes' : 'Create & Publish Property')}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, value, onChange, type = 'text', required, placeholder, step }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}{required && ' *'}</label>}
      <input
        type={type}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold placeholder-slate-400 focus:outline-none focus:border-primary transition-all"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold placeholder-slate-400 focus:outline-none focus:border-primary transition-all resize-none"
      />
    </div>
  );
}
