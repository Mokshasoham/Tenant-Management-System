import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { propertyService } from '../services/api';
import { X, UploadCloud, MapPin, XCircle, Video, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { useDropzone } from 'react-dropzone';
import { cn } from '../utils/cn';

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

const EMPTY_FORM = {
  name: '', address: '', city: '', state: '', zipCode: '', country: 'India',
  type: 'apartment', bedrooms: '', bathrooms: '', squareFeet: '',
  rentAmount: '', depositAmount: '', description: '', notes: '',
  amenities: '', bookingType: 'paid', publishStatus: 'published',
  seoTitle: '', seoDescription: '', seoKeywords: '',
  ogTitle: '', ogDescription: '', virtualTourUrl: ''
};

const libraries = ['places'];

export default function PropertyModal({ property, onClose, onSave }) {
  const [form, setForm] = useState(property ? {
    ...property,
    amenities: (property.amenities || []).join(', '),
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
  } : { ...EMPTY_FORM, location: { lat: 12.9716, lng: 77.5946 } });

  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autocompleteInstance, setAutocompleteInstance] = useState(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [], 'video/*': [] },
    onDrop: acceptedFiles => setMediaFiles(prev => [...prev, ...acceptedFiles])
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const payload = {
        ...form,
        amenities: form.amenities ? form.amenities.split(',').map(a => a.trim()).filter(Boolean) : [],
        seo: { title: form.seoTitle, description: form.seoDescription, keywords: form.seoKeywords },
        openGraph: { title: form.ogTitle, description: form.ogDescription, image: form.images?.[0] || '' }
      };

      let propertyId = property?._id;

      if (property) {
        await propertyService.updateProperty(propertyId, payload);
      } else {
        const res = await propertyService.createProperty(payload);
        propertyId = res.data._id;
      }

      // Handle Media Upload
      if (mediaFiles.length > 0) {
        const formData = new FormData();
        mediaFiles.forEach(file => formData.append('media', file));
        await propertyService.uploadPropertyMedia(propertyId, formData);
      }

      onSave();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl pb-8"
      >
        <div className="sticky top-0 flex items-center justify-between px-8 py-5 border-b border-border bg-card/95 backdrop-blur-sm z-10">
          <h2 className="text-xl font-black text-foreground">{property ? 'Edit Property' : 'Add Property'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="px-8 mt-6 space-y-8">
          {error && <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-bold">{error}</div>}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-primary uppercase tracking-widest border-b border-border pb-2">Basic Info</h3>
              <Field label="Property Name" required value={form.name} onChange={v => set('name', v)} />
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Address (Google Maps)*</label>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={setAutocompleteInstance}
                    onPlaceChanged={() => {
                      if (autocompleteInstance) {
                        const place = autocompleteInstance.getPlace();
                        if (place.geometry) {
                            setForm(p => ({
                            ...p,
                            address: place.formatted_address,
                            location: { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
                            }));
                        }
                      }
                    }}
                  >
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="text" value={form.address} onChange={e => set('address', e.target.value)} required
                        placeholder="Search address..."
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all" />
                    </div>
                  </Autocomplete>
                ) : (
                  <Field label="Address" required value={form.address} onChange={v => set('address', v)} />
                )}
              </div>

              {/* Country & State */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Country *</label>
                  <select value={form.country} onChange={e => { set('country', e.target.value); set('state', ''); }}
                    className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 appearance-none">
                    <option value="">Select Country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">State *</label>
                  {form.country === 'India' ? (
                    <select value={form.state} onChange={e => set('state', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 appearance-none">
                      <option value="">Select State</option>
                      {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={form.state} onChange={e => set('state', e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none" />
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" value={form.city} onChange={v => set('city', v)} />
                <Field label="ZIP / PIN Code" value={form.zipCode} onChange={v => set('zipCode', v)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Publish Status" value={form.publishStatus} onChange={v => set('publishStatus', v)} options={['draft', 'published', 'archived']} />
                <SelectField label="Type" value={form.type} onChange={v => set('type', v)} options={['apartment', 'house', 'commercial', 'land']} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Bedrooms" type="number" value={form.bedrooms} onChange={v => set('bedrooms', v)} />
                <Field label="Bathrooms" type="number" value={form.bathrooms} onChange={v => set('bathrooms', v)} />
                <Field label="Sq. Feet" type="number" value={form.squareFeet} onChange={v => set('squareFeet', v)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Monthly Rent (₹)" type="number" required value={form.rentAmount} onChange={v => set('rentAmount', v)} />
                <Field label="Deposit (₹)" type="number" value={form.depositAmount} onChange={v => set('depositAmount', v)} />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-primary uppercase tracking-widest border-b border-border pb-2">Media & Details</h3>
              
              {/* Media Dropzone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Media Upload (Images & Video)</label>
                <div {...getRootProps()} className={cn(
                  "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
                  isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-muted/50"
                )}>
                  <input {...getInputProps()} />
                  <UploadCloud className="w-8 h-8 text-primary mb-2 opacity-80" />
                  <p className="text-sm font-bold text-foreground">Drag & drop files here, or click to select</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">High-Res images will be compressed automatically</p>
                </div>
                {mediaFiles.length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                    {mediaFiles.map((file, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-border flex-shrink-0 group bg-muted flex items-center justify-center">
                        {file.type.startsWith('video') ? <Video className="w-6 h-6 text-muted-foreground" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
                        <button type="button" onClick={() => setMediaFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-0.5 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {property?.media?.length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                     {property.media.map((m, i) => (
                        <img key={i} src={m.url} className="w-16 h-16 rounded-xl object-cover border border-border" alt="" />
                     ))}
                  </div>
                )}
              </div>

              <Field label="Amenities Tags (comma-separated)" value={form.amenities} onChange={v => set('amenities', v)} placeholder="Parking, Pool, Gym, Laundry..." />
              <TextAreaField label="Description" value={form.description} onChange={v => set('description', v)} />
              <Field label="3D Virtual Tour URL" value={form.virtualTourUrl} onChange={v => set('virtualTourUrl', v)} placeholder="https://matterport.com/..." />
              
              {/* SEO Configurations */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                 <h4 className="text-xs font-black text-foreground uppercase tracking-widest">SEO Meta Configurations</h4>
                 <Field label="SEO Title" value={form.seoTitle} onChange={v => set('seoTitle', v)} placeholder="Luxury 3BHK Apartment..." />
                 <Field label="SEO Description" value={form.seoDescription} onChange={v => set('seoDescription', v)} placeholder="Brief compelling snippet for Google Search..." />
                 <Field label="SEO Keywords" value={form.seoKeywords} onChange={v => set('seoKeywords', v)} placeholder="real estate, rent, bangalore..." />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-border">
            <button type="button" onClick={onClose}
              className="px-8 py-3.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all font-bold">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Processing & Saving...' : (property ? 'Save Changes' : 'Create & Upload Property')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, value, onChange, type = 'text', required, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{label}{required && ' *'}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-all" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all appearance-none uppercase tracking-widest font-bold">
        {options.map(o => <option key={o} value={o}>{o.replace('-', ' ')}</option>)}
      </select>
    </div>
  );
}

function TextAreaField({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all resize-none" />
    </div>
  );
}
