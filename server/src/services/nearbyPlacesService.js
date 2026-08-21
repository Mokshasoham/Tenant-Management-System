/**
 * nearbyPlacesService.js
 * Production-grade service for discovering nearby amenities around a property,
 * calculating distances, and retrieving driving route geometry.
 * Features:
 * - Multi-tier OSM Provider: Multi-mirror Overpass API with adaptive radius + Nominatim POI fallback
 * - Single normalized property coordinate extractor (rejects 0,0 Null Island and invalid ranges)
 * - Robust category normalization across 8 standard categories
 * - In-memory property-specific caching (20 min TTL)
 * - OSRM driving route engine with graceful Haversine fallback
 */

// In-memory cache with 20-minute TTL
const cache = new Map();
const CACHE_TTL_MS = 20 * 60 * 1000;

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Extracts and validates geographical coordinates from any property object/document.
 * Supports: property.location.lat/lng, property.location.latitude/longitude, property.geo.coordinates [lng, lat]
 * Rejects: Null Island (0,0), non-numbers, out-of-range latitudes/longitudes.
 */
export function getPropertyCoordinates(property) {
  if (!property) return { valid: false, reason: 'LOCATION_UNAVAILABLE' };

  let lat = property.location?.lat ?? property.location?.latitude;
  let lng = property.location?.lng ?? property.location?.longitude;

  // Fallback to GeoJSON coordinates: [lng, lat]
  if (
    (lat === undefined || lng === undefined || lat === null || lng === null) &&
    Array.isArray(property.geo?.coordinates) &&
    property.geo.coordinates.length >= 2
  ) {
    lng = property.geo.coordinates[0];
    lat = property.geo.coordinates[1];
  }

  lat = Number(lat);
  lng = Number(lng);

  if (isNaN(lat) || isNaN(lng)) {
    return { valid: false, reason: 'LOCATION_UNAVAILABLE' };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, reason: 'LOCATION_UNAVAILABLE' };
  }

  // Reject Null Island (0, 0)
  if (lat === 0 && lng === 0) {
    return { valid: false, reason: 'LOCATION_UNAVAILABLE' };
  }

  return { valid: true, latitude: lat, longitude: lng };
}

/**
 * Calculates geographic distance in meters between two coordinates using the Haversine formula.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats meter distance into clean human-readable text.
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${meters} m from property`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km} km from property`;
}

/**
 * Maps raw OpenStreetMap tags into standardized TMS categories.
 */
function categorizeOsmPlace(tags = {}) {
  const amenity = (tags.amenity || '').toLowerCase();
  const railway = (tags.railway || '').toLowerCase();
  const aeroway = (tags.aeroway || '').toLowerCase();
  const shop = (tags.shop || '').toLowerCase();
  const leisure = (tags.leisure || '').toLowerCase();
  const tourism = (tags.tourism || '').toLowerCase();
  const highway = (tags.highway || '').toLowerCase();

  // 1. TRANSIT
  if (
    railway === 'station' ||
    railway === 'halt' ||
    railway === 'subway_entrance' ||
    railway === 'stop' ||
    aeroway === 'aerodrome' ||
    aeroway === 'terminal' ||
    aeroway === 'airport' ||
    amenity === 'bus_station' ||
    amenity === 'ferry_terminal' ||
    highway === 'bus_stop'
  ) {
    let sub = 'transit_station';
    if (railway === 'station' || railway === 'halt') sub = 'railway_station';
    else if (railway === 'subway_entrance') sub = 'subway_station';
    else if (aeroway === 'aerodrome' || aeroway === 'terminal' || aeroway === 'airport') sub = 'airport';
    else if (amenity === 'bus_station' || highway === 'bus_stop') sub = 'bus_station';
    return { category: 'transit', subcategory: sub };
  }

  // 2. HEALTH
  if (
    amenity === 'hospital' ||
    amenity === 'clinic' ||
    amenity === 'pharmacy' ||
    amenity === 'doctors' ||
    amenity === 'dentist' ||
    amenity === 'healthcare' ||
    shop === 'chemist' ||
    shop === 'medical_supply'
  ) {
    let sub = 'hospital';
    if (amenity === 'pharmacy' || shop === 'chemist') sub = 'pharmacy';
    else if (amenity === 'clinic' || amenity === 'doctors') sub = 'clinic';
    return { category: 'health', subcategory: sub };
  }

  // 3. FOOD & DINING
  if (
    amenity === 'restaurant' ||
    amenity === 'cafe' ||
    amenity === 'fast_food' ||
    amenity === 'food_court' ||
    amenity === 'bar' ||
    amenity === 'pub' ||
    amenity === 'ice_cream' ||
    shop === 'bakery' ||
    shop === 'beverages'
  ) {
    let sub = 'restaurant';
    if (amenity === 'cafe') sub = 'cafe';
    else if (shop === 'bakery') sub = 'bakery';
    return { category: 'food', subcategory: sub };
  }

  // 4. SHOPPING & MARKETS
  if (
    shop === 'mall' ||
    shop === 'supermarket' ||
    shop === 'department_store' ||
    shop === 'convenience' ||
    shop === 'general' ||
    shop === 'clothes' ||
    shop === 'grocery' ||
    amenity === 'marketplace' ||
    amenity === 'market'
  ) {
    let sub = 'shopping';
    if (shop === 'mall') sub = 'shopping_mall';
    else if (shop === 'supermarket' || shop === 'grocery') sub = 'supermarket';
    else if (amenity === 'marketplace' || amenity === 'market') sub = 'market';
    return { category: 'shopping', subcategory: sub };
  }

  // 5. EDUCATION
  if (
    amenity === 'school' ||
    amenity === 'college' ||
    amenity === 'university' ||
    amenity === 'kindergarten' ||
    amenity === 'library' ||
    amenity === 'music_school'
  ) {
    let sub = 'school';
    if (amenity === 'college' || amenity === 'university') sub = 'college';
    else if (amenity === 'library') sub = 'library';
    return { category: 'education', subcategory: sub };
  }

  // 6. FINANCE
  if (amenity === 'bank' || amenity === 'atm' || amenity === 'bureau_de_change') {
    return { category: 'finance', subcategory: amenity === 'atm' ? 'atm' : 'bank' };
  }

  // 7. ESSENTIALS & SERVICES
  if (
    amenity === 'fuel' ||
    amenity === 'police' ||
    amenity === 'post_office' ||
    amenity === 'place_of_worship' ||
    amenity === 'fire_station' ||
    amenity === 'community_centre' ||
    leisure === 'fitness_centre' ||
    leisure === 'sports_centre' ||
    leisure === 'park' ||
    tourism === 'hotel'
  ) {
    let sub = 'services';
    if (amenity === 'fuel') sub = 'fuel_station';
    else if (amenity === 'police') sub = 'police_station';
    else if (amenity === 'place_of_worship') sub = 'place_of_worship';
    else if (leisure === 'fitness_centre' || leisure === 'sports_centre') sub = 'gym';
    else if (leisure === 'park') sub = 'park';
    return { category: 'services', subcategory: sub };
  }

  return { category: 'services', subcategory: 'local_amenity' };
}

/**
 * Fetches nearby places using a resilient multi-tier strategy:
 * Tier 1: Overpass API with multi-mirror failover and adaptive radius.
 * Tier 2: OpenStreetMap Nominatim POI search fallback.
 */
export async function fetchNearbyPlaces(propertyId, lat, lng, category = 'all', requestedRadius = 8000) {
  const normCategory = (category || 'all').toLowerCase();
  const radius = Math.min(25000, Math.max(1000, Number(requestedRadius) || 8000));
  const cacheKey = `nearby:${propertyId}:${Math.round(lat * 10000)}:${Math.round(lng * 10000)}:${normCategory}:${radius}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.places;
  }

  const places = [];
  const seenKeys = new Set();

  const overpassMirrors = [
    'https://overpass.openstreetmap.fr/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  // Adaptive radius steps: start at 3500m (instant in dense cities), expand to 8000m if needed
  const radiusSteps = [3500, radius];

  for (const stepRadius of radiusSteps) {
    const query = `[out:json][timeout:10];
(
  node["amenity"~"^(hospital|clinic|pharmacy|bank|atm|school|college|university|restaurant|cafe|fast_food|fuel|police|bus_station|place_of_worship)$"](around:${stepRadius},${lat},${lng});
  node["railway"~"^(station|halt|subway_entrance)$"](around:${Math.max(stepRadius, 8000)},${lat},${lng});
  node["aeroway"~"^(aerodrome|terminal)$"](around:45000,${lat},${lng});
  node["shop"~"^(mall|supermarket|department_store|convenience|bakery)$"](around:${stepRadius},${lat},${lng});
  node["leisure"~"^(fitness_centre|park)$"](around:${stepRadius},${lat},${lng});
);
out center 45;`;

    for (const mirror of overpassMirrors) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(`${mirror}?data=${encodeURIComponent(query)}`, {
          headers: {
            'User-Agent': 'TenantManagementSystem/2.0 (Property Neighborhood Explorer)',
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.elements) && data.elements.length > 0) {
            for (const el of data.elements) {
              const tags = el.tags || {};
              const name = tags.name || tags['name:en'] || tags.brand || tags.operator;
              if (!name || name.trim().length === 0) continue;

              const placeLat = el.lat ?? el.center?.lat;
              const placeLng = el.lon ?? el.center?.lon;
              if (typeof placeLat !== 'number' || typeof placeLng !== 'number') continue;

              const dedupKey = `${name.toLowerCase().trim()}_${Math.round(placeLat * 1000)}_${Math.round(placeLng * 1000)}`;
              if (seenKeys.has(dedupKey)) continue;
              seenKeys.add(dedupKey);

              const classification = categorizeOsmPlace(tags);
              const distanceMeters = haversineDistance(lat, lng, placeLat, placeLng);

              const street = tags['addr:street'] ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}`.trim() : '';
              const suburb = tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:city'] || '';
              const address = street && suburb ? `${street}, ${suburb}` : street || suburb || '';

              places.push({
                id: `osm_${el.type}_${el.id}`,
                name: name.trim(),
                category: classification.category,
                subcategory: classification.subcategory,
                latitude: placeLat,
                longitude: placeLng,
                distanceMeters,
                distanceText: formatDistance(distanceMeters),
                address: address.trim(),
              });
            }
            break; // mirror succeeded
          }
        }
      } catch (err) {
        // try next mirror
      }
    }

    if (places.length >= 8) break; // sufficient places found
  }

  // Tier 2 Fallback: Nominatim POI search if Overpass returned 0
  if (places.length === 0) {
    const categoriesToSearch = [
      { cat: 'transit', q: 'station' },
      { cat: 'health', q: 'hospital' },
      { cat: 'food', q: 'restaurant' },
      { cat: 'shopping', q: 'supermarket' },
      { cat: 'education', q: 'school' },
      { cat: 'finance', q: 'bank' },
      { cat: 'services', q: 'fuel' },
    ];

    const viewbox = `${lng - 0.04},${lat + 0.04},${lng + 0.04},${lat - 0.04}`;

    await Promise.all(
      categoriesToSearch.map(async (item) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(item.q)}&format=json&bounded=1&viewbox=${viewbox}&limit=5&addressdetails=1`;
          const res = await fetch(url, {
            headers: { 'User-Agent': 'TMS-Property-Explorer/2.0' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              for (const p of data) {
                const pLat = parseFloat(p.lat);
                const pLng = parseFloat(p.lon);
                if (isNaN(pLat) || isNaN(pLng)) continue;

                const name = p.name || p.display_name?.split(',')[0];
                if (!name || name.trim().length === 0) continue;

                const dedupKey = `${name.toLowerCase().trim()}_${Math.round(pLat * 1000)}_${Math.round(pLng * 1000)}`;
                if (seenKeys.has(dedupKey)) continue;
                seenKeys.add(dedupKey);

                const distanceMeters = haversineDistance(lat, lng, pLat, pLng);

                places.push({
                  id: `nom_${p.place_id}`,
                  name: name.trim(),
                  category: item.cat,
                  subcategory: item.cat,
                  latitude: pLat,
                  longitude: pLng,
                  distanceMeters,
                  distanceText: formatDistance(distanceMeters),
                  address: p.display_name?.split(',').slice(1, 3).join(',').trim() || '',
                });
              }
            }
          }
        } catch (err) {
          // ignore individual search failures
        }
      })
    );
  }

  // Sort strictly by numeric distanceMeters ascending
  places.sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Filter by requested category if not 'all'
  let filtered = places;
  if (normCategory !== 'all') {
    filtered = places.filter((p) => p.category === normCategory);
  }

  // Cache normalized result set
  if (places.length > 0) {
    cache.set(cacheKey, { timestamp: Date.now(), places: filtered });
  }

  return filtered;
}

const NOMINATIM_CITY_KEYWORDS = {
  transit: ['railway station', 'train station', 'bus station', 'bus stand', 'bus stop', 'metro station', 'airport terminal'],
  health: ['hospital', 'clinic', 'pharmacy', 'medical center', 'diagnostic center', 'chemist', 'dental clinic', 'eye hospital'],
  food: ['restaurant', 'cafe', 'bakery', 'fast food', 'food court', 'bistro', 'hotel restaurant'],
  shopping: ['shopping mall', 'supermarket', 'market', 'department store', 'grocery store', 'clothing store'],
  education: ['school', 'college', 'university', 'institute', 'academy', 'public library'],
  finance: ['bank', 'atm', 'credit union'],
  services: ['petrol pump', 'fuel station', 'police station', 'fire station', 'temple', 'church', 'mosque', 'gym'],
  all: ['railway station', 'hospital', 'shopping mall', 'restaurant', 'college', 'bank', 'petrol pump'],
};

/**
 * Fetches city-wide places for a specific category across an expanded geographic radius (10km - 25km).
 * Uses targeted category Overpass queries with multi-keyword Nominatim POI search fallback.
 */
export async function fetchCityPlaces(propertyId, lat, lng, category = 'all', requestedRadius = 18000) {
  const normCategory = (category || 'all').toLowerCase();
  const radius = Math.min(30000, Math.max(5000, Number(requestedRadius) || 18000));
  const cacheKey = `city:${propertyId}:${Math.round(lat * 10000)}:${Math.round(lng * 10000)}:${normCategory}:${radius}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.places;
  }

  const places = [];
  const seenKeys = new Set();

  let overpassQueryBody = '';

  switch (normCategory) {
    case 'transit':
      overpassQueryBody = `
        node["railway"~"^(station|halt|subway_entrance|stop|tram_stop)$"](around:${radius},${lat},${lng});
        way["railway"~"^(station|halt)$"](around:${radius},${lat},${lng});
        node["amenity"~"^(bus_station|ferry_terminal)$"](around:${radius},${lat},${lng});
        way["amenity"~"^(bus_station|ferry_terminal)$"](around:${radius},${lat},${lng});
        node["highway"="bus_stop"](around:${radius},${lat},${lng});
        node["aeroway"~"^(aerodrome|terminal|airport)$"](around:50000,${lat},${lng});
      `;
      break;
    case 'health':
      overpassQueryBody = `
        node["amenity"~"^(hospital|clinic|pharmacy|doctors|dentist|healthcare)$"](around:${radius},${lat},${lng});
        way["amenity"~"^(hospital|clinic|pharmacy|doctors|dentist|healthcare)$"](around:${radius},${lat},${lng});
        node["healthcare"](around:${radius},${lat},${lng});
        way["healthcare"](around:${radius},${lat},${lng});
        node["shop"~"^(chemist|medical_supply)$"](around:${radius},${lat},${lng});
      `;
      break;
    case 'food':
      overpassQueryBody = `
        node["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream|bar|pub)$"](around:${radius},${lat},${lng});
        way["amenity"~"^(restaurant|cafe|fast_food|food_court)$"](around:${radius},${lat},${lng});
        node["shop"~"^(bakery|pastry|confectionery|beverages)$"](around:${radius},${lat},${lng});
      `;
      break;
    case 'shopping':
      overpassQueryBody = `
        node["shop"~"^(mall|supermarket|department_store|convenience|clothes|general|grocery|electronics|shoes)$"](around:${radius},${lat},${lng});
        way["shop"~"^(mall|supermarket|department_store)$"](around:${radius},${lat},${lng});
        node["amenity"~"^(marketplace|market)$"](around:${radius},${lat},${lng});
        way["amenity"~"^(marketplace|market)$"](around:${radius},${lat},${lng});
      `;
      break;
    case 'education':
      overpassQueryBody = `
        node["amenity"~"^(school|college|university|kindergarten|library|music_school|research_institute)$"](around:${radius},${lat},${lng});
        way["amenity"~"^(school|college|university|kindergarten|library)$"](around:${radius},${lat},${lng});
      `;
      break;
    case 'finance':
      overpassQueryBody = `
        node["amenity"~"^(bank|atm|bureau_de_change)$"](around:${radius},${lat},${lng});
        way["amenity"~"^(bank|atm)$"](around:${radius},${lat},${lng});
      `;
      break;
    case 'services':
      overpassQueryBody = `
        node["amenity"~"^(fuel|police|post_office|place_of_worship|fire_station|community_centre|townhall)$"](around:${radius},${lat},${lng});
        way["amenity"~"^(fuel|police|place_of_worship|fire_station|community_centre)$"](around:${radius},${lat},${lng});
        node["leisure"~"^(fitness_centre|sports_centre|park|playground)$"](around:${radius},${lat},${lng});
        way["leisure"~"^(fitness_centre|park)$"](around:${radius},${lat},${lng});
      `;
      break;
    case 'all':
    default:
      overpassQueryBody = `
        node["amenity"~"^(hospital|clinic|pharmacy|bank|atm|school|college|university|restaurant|cafe|fast_food|fuel|police|bus_station|place_of_worship)$"](around:${radius},${lat},${lng});
        way["amenity"~"^(hospital|clinic|school|college|university|restaurant|shopping_mall)$"](around:${radius},${lat},${lng});
        node["railway"~"^(station|halt|subway_entrance)$"](around:${radius},${lat},${lng});
        way["railway"~"^(station|halt)$"](around:${radius},${lat},${lng});
        node["shop"~"^(mall|supermarket|department_store|convenience|bakery)$"](around:${radius},${lat},${lng});
        node["leisure"~"^(fitness_centre|park)$"](around:${radius},${lat},${lng});
      `;
  }

  const query = `[out:json][timeout:12];(${overpassQueryBody});out center 150;`;
  const overpassMirrors = [
    'https://overpass.openstreetmap.fr/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  for (const mirror of overpassMirrors) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(`${mirror}?data=${encodeURIComponent(query)}`, {
        headers: {
          'User-Agent': 'TenantManagementSystem/2.0 (City Discovery Explorer)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.elements) && data.elements.length > 0) {
          for (const el of data.elements) {
            const tags = el.tags || {};
            const name = tags.name || tags['name:en'] || tags.brand || tags.operator;
            if (!name || name.trim().length === 0) continue;

            const placeLat = el.lat ?? el.center?.lat;
            const placeLng = el.lon ?? el.center?.lon;
            if (typeof placeLat !== 'number' || typeof placeLng !== 'number') continue;

            const dedupKey = `${name.toLowerCase().trim()}_${Math.round(placeLat * 1000)}_${Math.round(placeLng * 1000)}`;
            if (seenKeys.has(dedupKey)) continue;
            seenKeys.add(dedupKey);

            const classification = categorizeOsmPlace(tags);
            const categoryMatch = normCategory === 'all' || classification.category === normCategory;
            if (!categoryMatch && normCategory !== 'all') continue;

            const distanceMeters = haversineDistance(lat, lng, placeLat, placeLng);
            const street = tags['addr:street'] ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}`.trim() : '';
            const suburb = tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:city'] || '';
            const address = street && suburb ? `${street}, ${suburb}` : street || suburb || '';

            places.push({
              id: `osm_city_${el.type}_${el.id}`,
              name: name.trim(),
              category: classification.category,
              subcategory: classification.subcategory,
              latitude: placeLat,
              longitude: placeLng,
              distanceMeters,
              distanceText: formatDistance(distanceMeters),
              address: address.trim(),
            });
          }

          if (places.length >= 10) break;
        }
      }
    } catch (err) {
      // try next mirror
    }
  }

  // Tier 2 Fallback: Multi-keyword Nominatim POI search across the full city bounding box
  if (places.length < 10) {
    const keywords = NOMINATIM_CITY_KEYWORDS[normCategory] || NOMINATIM_CITY_KEYWORDS.all;
    const delta = radius / 111320;
    const viewbox = `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`;

    const results = await Promise.allSettled(
      keywords.slice(0, 6).map(async (kw) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(kw)}&format=json&bounded=1&viewbox=${viewbox}&limit=15&addressdetails=1`;
          const res = await fetch(url, {
            headers: { 'User-Agent': 'TMS-Property-Explorer/2.0' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) return await res.json();
          return [];
        } catch (e) {
          return [];
        }
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        for (const p of r.value) {
          const name = p.name || p.display_name?.split(',')[0];
          if (!name || name.trim().length === 0) continue;

          const pLat = parseFloat(p.lat);
          const pLng = parseFloat(p.lon);
          if (isNaN(pLat) || isNaN(pLng)) continue;

          const dedupKey = `${name.toLowerCase().trim()}_${Math.round(pLat * 1000)}_${Math.round(pLng * 1000)}`;
          if (seenKeys.has(dedupKey)) continue;
          seenKeys.add(dedupKey);

          const distanceMeters = haversineDistance(lat, lng, pLat, pLng);
          places.push({
            id: `nom_city_${p.place_id}`,
            name: name.trim(),
            category: normCategory === 'all' ? (p.type || 'services') : normCategory,
            subcategory: p.type || p.class || normCategory,
            latitude: pLat,
            longitude: pLng,
            distanceMeters,
            distanceText: formatDistance(distanceMeters),
            address: p.display_name?.split(',').slice(1, 3).join(',').trim() || '',
          });
        }
      }
    }
  }

  // Sort strictly by distanceMeters ascending from the property
  places.sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Cache result set
  if (places.length > 0) {
    cache.set(cacheKey, { timestamp: Date.now(), places });
  }

  return places;
}

/**
 * Retrieves driving route information between property coordinates and a destination.
 * Uses OSRM driving engine with graceful Haversine fallback.
 */
export async function getDrivingRoute(originLat, originLng, destLat, destLng) {
  if (
    typeof originLat !== 'number' ||
    typeof originLng !== 'number' ||
    typeof destLat !== 'number' ||
    typeof destLng !== 'number' ||
    isNaN(originLat) ||
    isNaN(originLng) ||
    isNaN(destLat) ||
    isNaN(destLng)
  ) {
    throw new Error('Valid numeric coordinates are required for route calculation.');
  }

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
  const straightLineDistance = haversineDistance(originLat, originLng, destLat, destLng);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(osrmUrl, {
      headers: {
        'User-Agent': 'TenantManagementSystem/2.0 (Route Engine)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.routes) && data.routes.length > 0) {
        const route = data.routes[0];
        const roadDistanceMeters = Math.round(route.distance);
        const durationSec = Math.round(route.duration);
        const mins = Math.round(durationSec / 60);

        return {
          success: true,
          distanceMeters: roadDistanceMeters,
          distanceText:
            roadDistanceMeters < 1000
              ? `${roadDistanceMeters} m by road`
              : `${(roadDistanceMeters / 1000).toFixed(1)} km by road`,
          durationSeconds: durationSec,
          durationText: mins < 60 ? `~${Math.max(1, mins)} min` : `~${(durationSec / 3600).toFixed(1)} hr`,
          geometry: route.geometry,
          isRoadRoute: true,
          mapsUrl,
        };
      }
    }
  } catch (err) {
    console.warn(`[nearbyPlacesService] OSRM routing fallback activated: ${err.message}`);
  }

  // Graceful fallback if routing service is unreachable
  return {
    success: true,
    distanceMeters: straightLineDistance,
    distanceText: `${(straightLineDistance / 1000).toFixed(1)} km (approx.)`,
    durationSeconds: null,
    durationText: 'Live estimate unavailable',
    geometry: {
      type: 'LineString',
      coordinates: [
        [originLng, originLat],
        [destLng, destLat],
      ],
    },
    isRoadRoute: false,
    mapsUrl,
    fallbackNotice: 'Route information is temporarily unavailable. Showing direct line and external map link.',
  };
}
