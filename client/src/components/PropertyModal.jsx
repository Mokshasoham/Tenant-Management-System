import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { propertyService } from '../services/api';
import { 
  X, UploadCloud, MapPin, XCircle, Video, Image as ImageIcon, Loader2, 
  CheckCircle2, Navigation, Layers, Compass, Sparkles, MoveLeft, MoveRight, 
  Eye, Globe, Shield, Star, Info, ArrowRight, Check, Building2, Home, Store,
  Building, KeyRound, Bed, Bath, Square, Users, Utensils, Zap, ShieldCheck
} from 'lucide-react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { useDropzone } from 'react-dropzone';
import { cn } from '../utils/cn';
import { resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../utils/propertyHelper';
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

const COMMERCIAL_BUSINESS_TYPES = [
  'Retail Store', 'Corporate Office', 'Clinic / Medical', 'Showroom',
  'Cafe / Restaurant', 'Cloud Kitchen', 'Warehouse / Storage', 'Salon / Spa', 'Bank / ATM'
];

const HOSTEL_FACILITIES = [
  'Study Hall', 'Mess / Dining Area', 'TV Lounge', 'Laundry Facility', 'Gym Room',
  'Warden on Duty', 'CCTV Security', 'High-Speed WiFi', 'Hot Water / Geyser'
];

const PG_FACILITIES = [
  'High-Speed WiFi', 'Daily Housekeeping', 'RO Purified Water', 'Washing Machine',
  'Refrigerator', 'Geyser / Hot Water', 'Power Backup', 'Attached Bathroom'
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
  type: 'apartment',
  bhk: '', bedrooms: '', bathrooms: '', squareFeet: '', floor: '', totalFloors: '',
  furnishing: 'unfurnished', balcony: '', parking: '', garden: '', builtUpArea: '',
  commercialArea: '', frontage: '', washroom: '', electricity: '', suitableFor: [],
  totalBeds: '', roomType: '', occupancyCapacity: '', genderPreference: 'any',
  foodAvailability: '', acAvailable: '', roomSharing: '', bathroomType: '',
  facilities: [], commonFacilities: [],
  rentAmount: '', depositAmount: '', description: '', notes: '',
  amenities: [], bookingType: 'paid', publishStatus: 'published',
  seoTitle: '', seoDescription: '', seoKeywords: '',
  ogTitle: '', ogDescription: '', virtualTourUrl: ''
};

const libraries = ['places'];

export default function PropertyModal({ property, initialType = 'apartment', onClose, onSave, onChangeType }) {
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'details' | 'location' | 'media' | 'seo'
  const [form, setForm] = useState(() => {
    if (property) {
      return {
        ...property,
        type: property.type || initialType || 'apartment',
        amenities: Array.isArray(property.amenities) ? property.amenities : (property.amenities || '').split(',').map(a => a.trim()).filter(Boolean),
        bhk: property.bhk || '',
        bedrooms: property.bedrooms ?? '',
        bathrooms: property.bathrooms ?? '',
        squareFeet: property.squareFeet ?? '',
        floor: property.floor ?? '',
        totalFloors: property.totalFloors ?? '',
        furnishing: property.furnishing || 'unfurnished',
        balcony: property.balcony ?? '',
        parking: property.parking || '',
        garden: property.garden || '',
        builtUpArea: property.builtUpArea ?? '',
        commercialArea: property.commercialArea ?? property.squareFeet ?? '',
        frontage: property.frontage || '',
        washroom: property.washroom || '',
        electricity: property.electricity || '',
        suitableFor: Array.isArray(property.suitableFor) ? property.suitableFor : [],
        totalBeds: property.totalBeds ?? '',
        roomType: property.roomType || '',
        occupancyCapacity: property.occupancyCapacity ?? '',
        genderPreference: property.genderPreference || 'any',
        foodAvailability: property.foodAvailability || '',
        acAvailable: property.acAvailable || '',
        roomSharing: property.roomSharing || '',
        bathroomType: property.bathroomType || '',
        facilities: Array.isArray(property.facilities) ? property.facilities : [],
        commonFacilities: Array.isArray(property.commonFacilities) ? property.commonFacilities : [],
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
    return {
      ...EMPTY_FORM,
      type: initialType || 'apartment',
      location: { lat: 12.9716, lng: 77.5946 }
    };
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
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: (acceptedFiles, fileRejections) => {
      if (fileRejections && fileRejections.length > 0) {
        const rejectionReasons = fileRejections.map(r => `${r.file.name}: ${r.errors.map(e => e.message).join(', ')}`).join('; ');
        setError(`File rejected: ${rejectionReasons}`);
      } else {
        setError('');
      }
      const newMedia = acceptedFiles.map(file => ({
        file,
        id: Math.random().toString(36).substring(7),
        preview: URL.createObjectURL(file),
        type: file.type.startsWith('video') ? 'video' : 'image',
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2)
      }));
      setMediaFiles(prev => [...prev, ...newMedia]);
    }
  });

  // Handle Dynamic Leaflet Interactive Map Pin Sync
  useEffect(() => {
    if (activeTab === 'location' && mapContainerRef.current) {
      const lat = Number(form.location?.lat) || 12.9716;
      const lng = Number(form.location?.lng) || 77.5946;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [lat, lng],
          zoom: 13,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

        marker.on('dragend', (e) => {
          const position = e.target.getLatLng();
          setForm(p => ({
            ...p,
            location: {
              lat: parseFloat(position.lat.toFixed(6)),
              lng: parseFloat(position.lng.toFixed(6)),
            }
          }));
        });

        map.on('click', (e) => {
          const { lat: clickedLat, lng: clickedLng } = e.latlng;
          marker.setLatLng([clickedLat, clickedLng]);
          setForm(p => ({
            ...p,
            location: {
              lat: parseFloat(clickedLat.toFixed(6)),
              lng: parseFloat(clickedLng.toFixed(6)),
            }
          }));
        });

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
      } else {
        const map = mapInstanceRef.current;
        const marker = markerInstanceRef.current;
        map.setView([lat, lng], map.getZoom() || 13);
        if (marker) marker.setLatLng([lat, lng]);
        setTimeout(() => map.invalidateSize(), 200);
      }
    }
  }, [activeTab, form.location?.lat, form.location?.lng]);

  const set = (key, value) => {
    setForm(p => ({ ...p, [key]: value }));
  };

  const handleStateChange = (stateName) => {
    const coords = COORDS_MAP[stateName];
    setForm(p => {
      const updated = { ...p, state: stateName };
      if (coords) {
        updated.location = { lat: coords.lat, lng: coords.lng };
      }
      return updated;
    });
  };

  const handleCityChange = (cityName) => {
    const coords = COORDS_MAP[cityName];
    setForm(p => {
      const updated = { ...p, city: cityName };
      if (coords) {
        updated.location = { lat: coords.lat, lng: coords.lng };
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

  const toggleArrayItem = (fieldKey, item) => {
    setForm(p => {
      const current = Array.isArray(p[fieldKey]) ? p[fieldKey] : [];
      if (current.includes(item)) {
        return { ...p, [fieldKey]: current.filter(a => a !== item) };
      } else {
        return { ...p, [fieldKey]: [...current, item] };
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
      // Basic common validations
      if (!form.name || !form.name.trim()) {
        setActiveTab('basic');
        throw new Error('Property name is required.');
      }
      if (!form.rentAmount || Number(form.rentAmount) <= 0) {
        setActiveTab('basic');
        throw new Error('Please specify a valid monthly rent amount.');
      }
      if (!form.address || !form.address.trim()) {
        setActiveTab('location');
        throw new Error('Property address is required.');
      }

      // Type-specific dynamic validations
      if ((form.type === 'commercial' || form.type === 'shop') && form.commercialArea && Number(form.commercialArea) <= 0) {
        setActiveTab('details');
        throw new Error('Commercial area must be greater than zero.');
      }
      if (form.type === 'hostel' && form.totalBeds && Number(form.totalBeds) <= 0) {
        setActiveTab('details');
        throw new Error('Total bed count must be greater than zero.');
      }

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
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        squareFeet: form.squareFeet ? Number(form.squareFeet) : (form.commercialArea ? Number(form.commercialArea) : undefined),
        floor: form.floor !== '' && form.floor !== undefined ? Number(form.floor) : undefined,
        totalFloors: form.totalFloors !== '' && form.totalFloors !== undefined ? Number(form.totalFloors) : undefined,
        balcony: form.balcony !== '' && form.balcony !== undefined ? Number(form.balcony) : undefined,
        builtUpArea: form.builtUpArea ? Number(form.builtUpArea) : undefined,
        commercialArea: form.commercialArea ? Number(form.commercialArea) : undefined,
        totalBeds: form.totalBeds ? Number(form.totalBeds) : undefined,
        occupancyCapacity: form.occupancyCapacity ? Number(form.occupancyCapacity) : undefined,
        amenities: Array.isArray(form.amenities) ? form.amenities : [],
        suitableFor: Array.isArray(form.suitableFor) ? form.suitableFor : [],
        facilities: Array.isArray(form.facilities) ? form.facilities : [],
        commonFacilities: Array.isArray(form.commonFacilities) ? form.commonFacilities : [],
        typeDetails: {
          bhk: form.bhk,
          floor: form.floor,
          totalFloors: form.totalFloors,
          balcony: form.balcony,
          parking: form.parking,
          garden: form.garden,
          builtUpArea: form.builtUpArea,
          commercialArea: form.commercialArea,
          frontage: form.frontage,
          washroom: form.washroom,
          electricity: form.electricity,
          suitableFor: form.suitableFor,
          totalBeds: form.totalBeds,
          roomType: form.roomType,
          occupancyCapacity: form.occupancyCapacity,
          genderPreference: form.genderPreference,
          foodAvailability: form.foodAvailability,
          acAvailable: form.acAvailable,
          roomSharing: form.roomSharing,
          bathroomType: form.bathroomType,
          facilities: form.facilities,
          commonFacilities: form.commonFacilities
        },
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
        propertyId = res.data._id || res.data?.data?._id;
      }

      setUploadProgress(50);

      // Handle Real File Uploads
      if (mediaFiles.length > 0 && propertyId) {
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

  const tabs = [
    { id: 'basic', label: '1. Basic Info', icon: Info },
    { id: 'details', label: '2. Specifications & Amenities', icon: Layers },
    { id: 'location', label: '3. Location & Map', icon: Compass },
    { id: 'media', label: '4. Media & 3D Tour', icon: ImageIcon },
    { id: 'seo', label: '5. SEO & Publish', icon: Globe }
  ];

  // Helper label for active property type
  const getTypeDisplay = (typeVal) => {
    switch (typeVal) {
      case 'apartment': return { label: 'Apartment / Flat', icon: Building2, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
      case 'house': case 'villa': return { label: 'House / Villa', icon: Home, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      case 'commercial': case 'shop': return { label: 'Shop / Commercial', icon: Store, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
      case 'hostel': return { label: 'Hostel', icon: Building, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' };
      case 'pg': return { label: 'PG / Paying Guest', icon: KeyRound, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
      default: return { label: typeVal ? (typeVal.charAt(0).toUpperCase() + typeVal.slice(1)) : 'Apartment', icon: Building2, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    }
  };

  const currentTypeInfo = getTypeDisplay(form.type);
  const TypeIcon = currentTypeInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-[2.5rem] border border-border bg-card shadow-2xl overflow-hidden backdrop-blur-xl"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                  {property ? 'Edit Property Workspace' : 'Add Property'}
                </h2>
                <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1", currentTypeInfo.color)}>
                  <TypeIcon className="w-3 h-3" />
                  <span>{currentTypeInfo.label}</span>
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Tailored Real Estate Listing Configuration
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Header Bar */}
        <div className="flex items-center gap-1 sm:gap-2 px-6 sm:px-8 py-3 bg-muted/50 border-b border-border overflow-x-auto scrollbar-none">
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
                    ? "bg-foreground text-background border-foreground shadow-md"
                    : "bg-card/60 text-muted-foreground border-border hover:text-foreground hover:bg-muted"
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
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Section 1 — Basic Information</h3>
                <p className="text-xs text-muted-foreground">Core listing identification, category parameters, and monthly pricing.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Property Name / Title *" required value={form.name} onChange={v => set('name', v)} placeholder="e.g. Skyline Luxury 2BHK Residency" />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Property Category *</label>
                    {onChangeType && (
                      <button
                        type="button"
                        onClick={onChangeType}
                        className="text-[10px] font-bold text-emerald-500 hover:underline cursor-pointer"
                      >
                        Change Type
                      </button>
                    )}
                  </div>
                  <select value={form.type} onChange={e => set('type', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500 capitalize">
                    <option value="apartment">Apartment / Flat</option>
                    <option value="house">House / Villa</option>
                    <option value="commercial">Shop / Commercial</option>
                    <option value="hostel">Hostel</option>
                    <option value="pg">PG / Paying Guest</option>
                    <option value="villa">Villa</option>
                    <option value="studio">Studio</option>
                    <option value="room">Room</option>
                    <option value="land">Land</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Publish Status</label>
                  <select value={form.publishStatus} onChange={e => set('publishStatus', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                    <option value="published">Published (Live in Directory)</option>
                    <option value="draft">Draft (Private Portfolio Only)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Monthly Rent (₹) *" type="number" required value={form.rentAmount} onChange={v => set('rentAmount', v)} placeholder="e.g. 25000" />
                  <Field label="Security Deposit (₹)" type="number" value={form.depositAmount} onChange={v => set('depositAmount', v)} placeholder="e.g. 50000" />
                </div>
              </div>

              <TextAreaField label="Property Description" value={form.description} onChange={v => set('description', v)} placeholder="Highlight key residency highlights, floor level, view, proximity to transit, rules..." />
            </motion.div>
          )}

          {/* TAB 2: SPECIFICATIONS & AMENITIES (DYNAMICALLY TAILORED) */}
          {activeTab === 'details' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest">
                    Section 2 — Tailored Specifications ({currentTypeInfo.label})
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">Detailed layout attributes tailored specifically for this property type.</p>
              </div>

              {/* ── TYPE 1: APARTMENT / FLAT ── */}
              {form.type === 'apartment' && (
                <div className="space-y-5 p-5 rounded-3xl bg-muted/30 border border-border">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">BHK Layout</label>
                      <select value={form.bhk || ''} onChange={e => set('bhk', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="">Select BHK</option>
                        <option value="Studio">Studio Apartment</option>
                        <option value="1 BHK">1 BHK</option>
                        <option value="2 BHK">2 BHK</option>
                        <option value="3 BHK">3 BHK</option>
                        <option value="4 BHK">4 BHK</option>
                        <option value="4+ BHK">4+ BHK / Penthouse</option>
                      </select>
                    </div>

                    <Field label="Bedrooms" type="number" value={form.bedrooms} onChange={v => set('bedrooms', v)} placeholder="e.g. 2" />
                    <Field label="Bathrooms" type="number" value={form.bathrooms} onChange={v => set('bathrooms', v)} placeholder="e.g. 2" />
                    <Field label="Square Feet (Area)" type="number" value={form.squareFeet} onChange={v => set('squareFeet', v)} placeholder="e.g. 1250" />
                    <Field label="Floor Level" type="number" value={form.floor} onChange={v => set('floor', v)} placeholder="e.g. 4" />
                    <Field label="Total Floors in Bldg" type="number" value={form.totalFloors} onChange={v => set('totalFloors', v)} placeholder="e.g. 12" />

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Furnishing Status</label>
                      <select value={form.furnishing || 'unfurnished'} onChange={e => set('furnishing', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="unfurnished">Unfurnished</option>
                        <option value="semi-furnished">Semi-Furnished</option>
                        <option value="fully-furnished">Fully-Furnished</option>
                      </select>
                    </div>

                    <Field label="Balconies Count" type="number" value={form.balcony} onChange={v => set('balcony', v)} placeholder="e.g. 2" />

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Parking Facility</label>
                      <select value={form.parking || ''} onChange={e => set('parking', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="">Select Parking</option>
                        <option value="Covered Parking">Covered Stilt Parking</option>
                        <option value="Open Parking">Open Designated Parking</option>
                        <option value="Two-Wheeler Only">Two-Wheeler Only</option>
                        <option value="No Parking">No Parking Available</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TYPE 2: HOUSE / VILLA ── */}
              {(form.type === 'house' || form.type === 'villa') && (
                <div className="space-y-5 p-5 rounded-3xl bg-muted/30 border border-border">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Field label="Bedrooms" type="number" value={form.bedrooms} onChange={v => set('bedrooms', v)} placeholder="e.g. 4" />
                    <Field label="Bathrooms" type="number" value={form.bathrooms} onChange={v => set('bathrooms', v)} placeholder="e.g. 4" />
                    <Field label="Built-up Area (Sq Ft)" type="number" value={form.builtUpArea || form.squareFeet} onChange={v => { set('builtUpArea', v); set('squareFeet', v); }} placeholder="e.g. 2800" />
                    <Field label="Total House Stories" type="number" value={form.totalFloors} onChange={v => set('totalFloors', v)} placeholder="e.g. 2 (G + 1)" />

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Furnishing Status</label>
                      <select value={form.furnishing || 'unfurnished'} onChange={e => set('furnishing', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="unfurnished">Unfurnished</option>
                        <option value="semi-furnished">Semi-Furnished</option>
                        <option value="fully-furnished">Fully-Furnished</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Garden / Outdoor Space</label>
                      <select value={form.garden || ''} onChange={e => set('garden', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="">Select Garden Type</option>
                        <option value="Private Front Lawn & Garden">Private Front Lawn & Garden</option>
                        <option value="Terrace Garden">Rooftop Terrace Garden</option>
                        <option value="Backyard Courtyard">Backyard Courtyard</option>
                        <option value="No Garden">No Private Garden</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Driveway & Parking</label>
                      <select value={form.parking || ''} onChange={e => set('parking', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="">Select Parking</option>
                        <option value="Private Garage (2+ Cars)">Private Garage (2+ Cars)</option>
                        <option value="Covered Driveway">Covered Driveway</option>
                        <option value="Open Compound Parking">Open Compound Parking</option>
                        <option value="Street Parking Only">Street Parking Only</option>
                      </select>
                    </div>

                    <Field label="Balconies / Terraces" type="number" value={form.balcony} onChange={v => set('balcony', v)} placeholder="e.g. 3" />
                  </div>
                </div>
              )}

              {/* ── TYPE 3: SHOP / COMMERCIAL ── */}
              {(form.type === 'commercial' || form.type === 'shop') && (
                <div className="space-y-5 p-5 rounded-3xl bg-muted/30 border border-border">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Field label="Commercial Area (Sq Ft) *" type="number" value={form.commercialArea || form.squareFeet} onChange={v => { set('commercialArea', v); set('squareFeet', v); }} placeholder="e.g. 1200" />
                    <Field label="Shop / Floor Level" type="number" value={form.floor} onChange={v => set('floor', v)} placeholder="e.g. 0 (Ground)" />
                    <Field label="Frontage / Glass Width (ft)" value={form.frontage} onChange={v => set('frontage', v)} placeholder="e.g. 25 ft" />

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Washroom Setup</label>
                      <select value={form.washroom || ''} onChange={e => set('washroom', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="">Select Washroom</option>
                        <option value="Private Attached Washroom">Private Attached Washroom</option>
                        <option value="Common Floor Washroom">Common Floor Washroom</option>
                        <option value="No Washroom Inside">No Dedicated Washroom</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Electricity & Power</label>
                      <select value={form.electricity || ''} onChange={e => set('electricity', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="">Select Power Setup</option>
                        <option value="3-Phase Commercial Dedicated">3-Phase Commercial Dedicated</option>
                        <option value="Single Phase Commercial">Single Phase Commercial</option>
                        <option value="10+ kVA High Load Power">10+ kVA High Load Power</option>
                        <option value="Full Power Backup DG">Full Power Backup DG</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fit-Out / Furnishing</label>
                      <select value={form.furnishing || 'unfurnished'} onChange={e => set('furnishing', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="unfurnished">Bare Shell (Unfurnished)</option>
                        <option value="semi-furnished">Warm Shell (Flooring & Lighting)</option>
                        <option value="fully-furnished">Fully Fitted / Furnished Office</option>
                      </select>
                    </div>
                  </div>

                  {/* Commercial Business Types Selector */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Suitable Business Types (Multi-Select)</label>
                    <div className="flex flex-wrap gap-2">
                      {COMMERCIAL_BUSINESS_TYPES.map((biz) => {
                        const isSelected = (form.suitableFor || []).includes(biz);
                        return (
                          <button
                            key={biz}
                            type="button"
                            onClick={() => toggleArrayItem('suitableFor', biz)}
                            className={cn(
                              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer",
                              isSelected
                                ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                                : "bg-muted/70 text-muted-foreground border-border hover:text-foreground"
                            )}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            <span>{biz}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TYPE 4: HOSTEL ── */}
              {form.type === 'hostel' && (
                <div className="space-y-5 p-5 rounded-3xl bg-muted/30 border border-border">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <Field label="Total Beds Available *" type="number" value={form.totalBeds} onChange={v => set('totalBeds', v)} placeholder="e.g. 50" />
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Room Type / Sharing</label>
                      <select value={form.roomType || ''} onChange={e => set('roomType', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="">Select Room Type</option>
                        <option value="Single Private Room">Single Private Room</option>
                        <option value="2-Bed Double Sharing">2-Bed Double Sharing</option>
                        <option value="3-Bed Triple Sharing">3-Bed Triple Sharing</option>
                        <option value="4-Bed Sharing Room">4-Bed Sharing Room</option>
                        <option value="Dormitory (6+ Beds)">Dormitory (6+ Beds)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gender Preference</label>
                      <select value={form.genderPreference || 'any'} onChange={e => set('genderPreference', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="male">Boys / Male Only</option>
                        <option value="female">Girls / Female Only</option>
                        <option value="co-ed">Co-ed / Unisex</option>
                        <option value="any">Open / Any</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Food & Mess Availability</label>
                      <select value={form.foodAvailability || ''} onChange={e => set('foodAvailability', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="">Select Food Plan</option>
                        <option value="All 3 Meals Included">All 3 Meals Included (Breakfast, Lunch, Dinner)</option>
                        <option value="Breakfast & Dinner Only">Breakfast & Dinner Only</option>
                        <option value="Optional Mess Subscription">Optional Mess Subscription</option>
                        <option value="Self Cooking Allowed">Self Cooking Allowed in Common Kitchen</option>
                        <option value="No Food Facility">No Food Facility</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Air Conditioning</label>
                      <select value={form.acAvailable || ''} onChange={e => set('acAvailable', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="">Select AC Option</option>
                        <option value="AC Rooms Available">AC Rooms Available</option>
                        <option value="Non-AC Rooms">Non-AC Rooms</option>
                        <option value="Both AC & Non-AC Available">Both AC & Non-AC Available</option>
                      </select>
                    </div>

                    <Field label="Total Occupancy Capacity" type="number" value={form.occupancyCapacity} onChange={v => set('occupancyCapacity', v)} placeholder="e.g. 100" />
                  </div>

                  {/* Common Hostel Facilities */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Common Hostel Facilities (Multi-Select)</label>
                    <div className="flex flex-wrap gap-2">
                      {HOSTEL_FACILITIES.map((fac) => {
                        const isSelected = (form.commonFacilities || []).includes(fac);
                        return (
                          <button
                            key={fac}
                            type="button"
                            onClick={() => toggleArrayItem('commonFacilities', fac)}
                            className={cn(
                              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer",
                              isSelected
                                ? "bg-purple-500 text-white border-purple-500 shadow-sm"
                                : "bg-muted/70 text-muted-foreground border-border hover:text-foreground"
                            )}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            <span>{fac}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TYPE 5: PG / PAYING GUEST ── */}
              {form.type === 'pg' && (
                <div className="space-y-5 p-5 rounded-3xl bg-muted/30 border border-border">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Room Type</label>
                      <select value={form.roomType || ''} onChange={e => set('roomType', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="">Select Room Type</option>
                        <option value="Single Occupancy">Single Occupancy</option>
                        <option value="Double Sharing">Double Sharing (2 Beds)</option>
                        <option value="Triple Sharing">Triple Sharing (3 Beds)</option>
                        <option value="Four Sharing">Four Sharing (4 Beds)</option>
                      </select>
                    </div>

                    <Field label="Sharing Capacity (Persons/Room)" type="number" value={form.sharingCapacity || form.occupancyCapacity} onChange={v => { set('sharingCapacity', v); set('occupancyCapacity', v); }} placeholder="e.g. 2" />

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gender Preference</label>
                      <select value={form.genderPreference || 'any'} onChange={e => set('genderPreference', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="male">Male / Boys PG</option>
                        <option value="female">Female / Girls PG</option>
                        <option value="co-ed">Co-ed / Unisex PG</option>
                        <option value="any">Open / Any</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Food & Meals</label>
                      <select value={form.foodAvailability || ''} onChange={e => set('foodAvailability', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="">Select Food Option</option>
                        <option value="3 Meals Daily (Home Cooked)">3 Meals Daily (Home Cooked)</option>
                        <option value="Breakfast & Dinner">Breakfast & Dinner Included</option>
                        <option value="Optional Food Package">Optional Food Package</option>
                        <option value="No Food Included">No Food Included</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bathroom Type</label>
                      <select value={form.bathroomType || ''} onChange={e => set('bathroomType', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="">Select Bathroom</option>
                        <option value="Attached Bathroom (Private)">Attached Bathroom (Private)</option>
                        <option value="Shared Bathroom on Floor">Shared Bathroom on Floor</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AC / Non-AC</label>
                      <select value={form.acAvailable || ''} onChange={e => set('acAvailable', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/80 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500">
                        <option value="">Select AC Type</option>
                        <option value="AC Room">AC Room</option>
                        <option value="Non-AC Room">Non-AC Room</option>
                        <option value="Both Options Available">Both Options Available</option>
                      </select>
                    </div>
                  </div>

                  {/* PG In-Room & House Facilities */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">PG Facilities (Multi-Select)</label>
                    <div className="flex flex-wrap gap-2">
                      {PG_FACILITIES.map((fac) => {
                        const isSelected = (form.facilities || []).includes(fac);
                        return (
                          <button
                            key={fac}
                            type="button"
                            onClick={() => toggleArrayItem('facilities', fac)}
                            className={cn(
                              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer",
                              isSelected
                                ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                                : "bg-muted/70 text-muted-foreground border-border hover:text-foreground"
                            )}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            <span>{fac}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── GENERAL AMENITIES SELECTOR (APPLIES TO ALL TYPES) ── */}
              <div className="space-y-3 pt-4 border-t border-border">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">General Property Amenities</label>
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
                            : "bg-muted/60 text-muted-foreground border-border hover:text-foreground hover:bg-muted"
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
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Section 3 — Geolocation & Interactive Map</h3>
                <p className="text-xs text-muted-foreground">Search address or click on the interactive map to position the property pin.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Address Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Address (Search / Text) *</label>
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
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input type="text" value={form.address} onChange={e => set('address', e.target.value)} required
                            placeholder="Search address or enter street..."
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500" />
                        </div>
                      </Autocomplete>
                    ) : (
                      <Field label="" required value={form.address} onChange={v => set('address', v)} placeholder="e.g. 123 Main Street" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Country *</label>
                      <select value={form.country} onChange={e => { set('country', e.target.value); set('state', ''); }}
                        className="w-full px-4 py-3 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold focus:outline-none">
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">State *</label>
                      {form.country === 'India' ? (
                        <select value={form.state} onChange={e => handleStateChange(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold focus:outline-none">
                          <option value="">Select State</option>
                          {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <input type="text" value={form.state} onChange={e => handleStateChange(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold focus:outline-none" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City" value={form.city} onChange={v => handleCityChange(v)} placeholder="e.g. Bengaluru" />
                    <Field label="ZIP / PIN Code" value={form.zipCode} onChange={v => set('zipCode', v)} placeholder="e.g. 560001" />
                  </div>

                  {/* Latitude / Longitude & GPS Trigger */}
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">GPS Coordinates</span>
                      <button
                        type="button"
                        onClick={handleUseMyLocation}
                        disabled={gettingLocation}
                        className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-emerald-500/20 transition-all cursor-pointer"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>{gettingLocation ? 'Locating...' : 'Use My GPS'}</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Latitude" type="number" step="any" value={form.location?.lat} onChange={v => set('location', { ...form.location, lat: v })} placeholder="12.9716" />
                      <Field label="Longitude" type="number" step="any" value={form.location?.lng} onChange={v => set('location', { ...form.location, lng: v })} placeholder="77.5946" />
                    </div>
                  </div>
                </div>

                {/* Leaflet Interactive Map Container */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <span>Interactive Pin Drop</span>
                    <span className="text-[9px] text-emerald-500 font-bold">(Drag pin or click map)</span>
                  </label>
                  <div 
                    ref={mapContainerRef} 
                    className="w-full h-72 sm:h-80 rounded-2xl border border-border overflow-hidden shadow-inner z-0 bg-muted" 
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: MEDIA & 3D TOUR */}
          {activeTab === 'media' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Section 4 — Visual Media Assets</h3>
                <p className="text-xs text-muted-foreground">Upload property photos, video tours, and set the primary portfolio cover image.</p>
              </div>

              {/* Drag and Drop Zone */}
              <div
                {...getRootProps()}
                className={cn(
                  "p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3",
                  isDragActive
                    ? "border-emerald-500 bg-emerald-500/10 scale-[0.99]"
                    : "border-border bg-muted/30 hover:bg-muted/50 hover:border-border"
                )}
              >
                <input {...getInputProps()} />
                <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-foreground">
                    {isDragActive ? 'Drop images or videos here...' : 'Click to Browse or Drag & Drop Media Files'}
                  </p>
                  <p className="text-xs text-muted-foreground">Supports JPEG, PNG, WebP images and MP4, WebM videos (up to 50MB each)</p>
                </div>
              </div>

              {/* Media Previews Grid */}
              {mediaFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selected Assets ({mediaFiles.length})</span>
                    <span className="text-[10px] text-emerald-500 font-bold">First file marked as Primary Cover</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {mediaFiles.map((item, idx) => (
                      <div
                        key={item.id}
                        className={cn(
                          "relative rounded-2xl overflow-hidden border aspect-video group bg-muted",
                          coverIndex === idx ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-border"
                        )}
                      >
                        {item.type === 'video' ? (
                          <video src={item.preview} className="w-full h-full object-cover" />
                        ) : (
                          <img src={item.preview} alt={item.name} className="w-full h-full object-cover" />
                        )}

                        {/* Badges & Actions */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          {coverIndex === idx && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest shadow-md">
                              Primary Cover
                            </span>
                          )}
                          {item.type === 'video' && (
                            <span className="p-1 rounded-md bg-black/60 text-white text-[9px] backdrop-blur-md">
                              <Video className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeMedia(idx)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-rose-500 transition-colors backdrop-blur-md opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        <div className="absolute bottom-2 inset-x-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveMedia(idx, idx - 1)}
                            className="p-1 rounded-md bg-black/70 text-white hover:bg-black disabled:opacity-30 cursor-pointer"
                          >
                            <MoveLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCoverIndex(idx)}
                            className="px-2 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-bold hover:bg-emerald-500 cursor-pointer"
                          >
                            Set Cover
                          </button>
                          <button
                            type="button"
                            disabled={idx === mediaFiles.length - 1}
                            onClick={() => moveMedia(idx, idx + 1)}
                            className="p-1 rounded-md bg-black/70 text-white hover:bg-black disabled:opacity-30 cursor-pointer"
                          >
                            <MoveRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3D Virtual Tour URL */}
              <Field label="3D Virtual Tour / Matterport Link" value={form.virtualTourUrl} onChange={v => set('virtualTourUrl', v)} placeholder="https://my.matterport.com/show/?m=..." />
            </motion.div>
          )}

          {/* TAB 5: SEO & PUBLISH */}
          {activeTab === 'seo' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Section 5 — SEO & Social Meta</h3>
                <p className="text-xs text-muted-foreground">Search engine discovery, snippet previews, and social media open graph cards.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="SEO Title Tag" value={form.seoTitle} onChange={v => set('seoTitle', v)} placeholder="e.g. 2 BHK Luxury Flat in Bangalore | TMS" />
                <Field label="SEO Keywords" value={form.seoKeywords} onChange={v => set('seoKeywords', v)} placeholder="e.g. bangalore, flat, 2bhk, rent" />
              </div>

              <TextAreaField label="SEO Meta Description" value={form.seoDescription} onChange={v => set('seoDescription', v)} placeholder="Brief summary displayed on Google Search results pages..." />

              <div className="p-5 rounded-3xl bg-muted/40 border border-border space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-500" /> Search Snippet Preview
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer truncate">
                    {form.seoTitle || form.name || 'Your Property Title'} | Tenant Management System
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    https://tms.app/properties/{form.name ? form.name.toLowerCase().replace(/\s+/g, '-') : 'property-slug'}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {form.seoDescription || form.description || 'Explore this verified rental listing with real-time availability and transparent pricing.'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-t border-border bg-muted/40">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-border text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e, 'draft')}
              className="px-5 py-3 rounded-2xl border border-border text-foreground font-black text-xs hover:bg-muted transition-all disabled:opacity-50 cursor-pointer"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e, 'published')}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs tracking-wide shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
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
      {label && <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}{required && ' *'}</label>}
      <input
        type={type}
        step={step}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold placeholder-muted-foreground/40 focus:outline-none focus:border-emerald-500 transition-all"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</label>
      <textarea
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-3 rounded-2xl bg-muted/60 border border-border text-foreground text-xs font-bold placeholder-muted-foreground/40 focus:outline-none focus:border-emerald-500 transition-all resize-none"
      />
    </div>
  );
}
