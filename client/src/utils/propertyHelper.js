const parseDateSafe = (val) => {
    if (!val) return null;
    if (val instanceof Date) {
        return isNaN(val.getTime()) ? null : val;
    }
    if (typeof val === 'number') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === 'string') {
        const str = val.trim();
        const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1;
            const day = parseInt(match[3], 10);
            return new Date(year, month, day);
        }
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
};

export const getDisplayStatus = (property) => {
    if (!property) return 'Available';

    // 1. Maintenance status check
    if (property.status === 'maintenance' || property.displayStatus === 'Under Maintenance') {
        return 'Under Maintenance';
    }

    // 2. Explicit availability date check (e.g. availableFrom, availableDate, etc.)
    const rawDate =
        property.availableFrom ||
        property.availableDate ||
        property.availabilityDate ||
        property.availableFromDate ||
        property.availability?.availableFrom ||
        property.availability?.date;

    if (rawDate) {
        const targetDate = parseDateSafe(rawDate);
        if (targetDate) {
            const now = new Date();
            const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);

            if (targetMidnight.getTime() > todayMidnight.getTime()) {
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const day = targetDate.getDate();
                const month = monthNames[targetDate.getMonth()];
                return `Available from ${day} ${month}`;
            } else {
                return 'Available';
            }
        }
    }

    // 3. Pre-computed displayStatus from backend
    if (property.displayStatus) {
        const cleaned = property.displayStatus.replace(/, \d{4}$/, '');
        if (cleaned !== 'Available') {
            return cleaned;
        }
    }

    // 4. Frontend fallback calculation for occupied / rented properties
    if (property.status === 'occupied' || property.status === 'rented') {
        // 1. Try to find the active lease
        const activeLease = property.activeLease || property.leases?.find(l => l && l.status === 'active');
        let targetDate = activeLease?.endDate ? new Date(activeLease.endDate) : null;
        
        // 2. If no active lease, try any lease
        if (!targetDate && property.leases && property.leases.length > 0) {
            const sortedLeases = [...property.leases].sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
            if (sortedLeases[0]?.endDate) {
                targetDate = new Date(sortedLeases[0].endDate);
            }
        }
        
        // 3. If still no date, calculate fallback (6 months from property creation)
        if (!targetDate) {
            const baseDate = property.createdAt ? new Date(property.createdAt) : new Date();
            targetDate = new Date(baseDate.getTime() + 180 * 24 * 60 * 60 * 1000);
        }
        
        // 4. If the resolved date is in the past, push it to 30 days from today
        if (targetDate <= new Date()) {
            targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = targetDate.getDate();
        const month = monthNames[targetDate.getMonth()];
        return `Available from ${day} ${month}`;
    }
    
    return 'Available';
};

export const getBackendBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'https://tenant-management-backend-ohr6.onrender.com';
  }
  const envBase = import.meta.env?.VITE_API_BASE_URL;
  if (envBase && !envBase.includes('localhost')) {
    return envBase.replace(/\/api\/?$/, '');
  }
  return 'http://localhost:5000';
};

export const resolveMediaUrl = (rawUrl) => {
  if (!rawUrl) return '';
  let u = String(rawUrl).trim();

  // If already data or blob URL
  if (u.startsWith('data:') || u.startsWith('blob:')) return u;

  // Clean any internal double slashes in paths (except http:// or https://)
  u = u.replace(/([^:])\/+/g, '$1/');

  const backendBase = getBackendBaseUrl();

  // Strip localhost or 127.0.0.1
  if (u.startsWith('http://localhost') || u.startsWith('http://127.0.0.1')) {
    u = u.replace(/^https?:\/\/[^\/]+/, '');
  }

  // If URL points to onrender backend with double slashes or extra path, clean origin
  if (u.includes('tenant-management-backend-ohr6.onrender.com')) {
    u = u.replace(/^https?:\/\/[^\/]+/, '');
  }

  // If it is a 3rd-party absolute URL (S3, Cloudinary, etc.)
  if (u.startsWith('http://') || u.startsWith('https://')) {
    return u;
  }

  const cleanPath = u.replace(/^\/+/, '');
  return `${backendBase}/${cleanPath}`;
};

export const DEFAULT_PLACEHOLDER_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
