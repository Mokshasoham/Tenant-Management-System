/**
 * nearbyPlacesService.js
 * Production-grade service for discovering nearby amenities around a property,
 * calculating distances, and retrieving driving route geometry.
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
  const amenity = tags.amenity || '';
  const railway = tags.railway || '';
  const aeroway = tags.aeroway || '';
  const shop = tags.shop || '';
  const leisure = tags.leisure || '';
  const tourism = tags.tourism || '';
  const highway = tags.highway || '';

  // 1. TRANSIT
  if (
    railway === 'station' ||
    railway === 'halt' ||
    railway === 'subway_entrance' ||
    aeroway === 'aerodrome' ||
    aeroway === 'terminal' ||
    amenity === 'bus_station' ||
    highway === 'bus_stop'
  ) {
    let sub = 'transit_station';
    if (railway === 'station' || railway === 'halt') sub = 'railway_station';
    else if (aeroway === 'aerodrome' || aeroway === 'terminal') sub = 'airport';
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
    shop === 'chemist'
  ) {
    let sub = 'hospital';
    if (amenity === 'pharmacy' || shop === 'chemist') sub = 'pharmacy';
    else if (amenity === 'clinic') sub = 'clinic';
    return { category: 'health', subcategory: sub };
  }

  // 3. FOOD & DINING
  if (
    amenity === 'restaurant' ||
    amenity === 'cafe' ||
    amenity === 'fast_food' ||
    amenity === 'food_court' ||
    amenity === 'bar' ||
    shop === 'bakery'
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
    amenity === 'marketplace'
  ) {
    let sub = 'shopping';
    if (shop === 'mall') sub = 'shopping_mall';
    else if (shop === 'supermarket') sub = 'supermarket';
    else if (amenity === 'marketplace') sub = 'market';
    return { category: 'shopping', subcategory: sub };
  }

  // 5. EDUCATION
  if (
    amenity === 'school' ||
    amenity === 'college' ||
    amenity === 'university' ||
    amenity === 'kindergarten' ||
    amenity === 'library'
  ) {
    let sub = 'school';
    if (amenity === 'college' || amenity === 'university') sub = 'college';
    else if (amenity === 'library') sub = 'library';
    return { category: 'education', subcategory: sub };
  }

  // 6. FINANCE
  if (amenity === 'bank' || amenity === 'atm') {
    return { category: 'finance', subcategory: amenity === 'atm' ? 'atm' : 'bank' };
  }

  // 7. ESSENTIALS & SERVICES
  if (
    amenity === 'fuel' ||
    amenity === 'police' ||
    amenity === 'post_office' ||
    amenity === 'place_of_worship' ||
    amenity === 'fire_station' ||
    leisure === 'fitness_centre' ||
    leisure === 'park' ||
    tourism === 'hotel'
  ) {
    let sub = 'services';
    if (amenity === 'fuel') sub = 'fuel_station';
    else if (amenity === 'police') sub = 'police_station';
    else if (amenity === 'place_of_worship') sub = 'place_of_worship';
    else if (leisure === 'fitness_centre') sub = 'gym';
    else if (leisure === 'park') sub = 'park';
    return { category: 'services', subcategory: sub };
  }

  return null;
}

/**
 * Fetches nearby places from OpenStreetMap Overpass API around given coordinates.
 */
export async function fetchNearbyPlacesFromOverpass(propertyId, lat, lng, radius = 8000) {
  const cacheKey = `${propertyId}_${Math.round(lat * 10000)}_${Math.round(lng * 10000)}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.places;
  }

  // High-efficiency regex-anchored Overpass QL Query
  const query = `[out:json][timeout:15];
(
  node["amenity"~"^(hospital|clinic|pharmacy|bank|atm|school|college|university|restaurant|cafe|fast_food|fuel|police|bus_station|place_of_worship)$"](around:${radius},${lat},${lng});
  node["railway"~"^(station|halt)$"](around:${Math.max(radius, 15000)},${lat},${lng});
  node["shop"~"^(mall|supermarket|department_store|convenience|bakery)$"](around:${radius},${lat},${lng});
  node["leisure"~"^(fitness_centre|park)$"](around:${radius},${lat},${lng});
);
out 50;`;

  const overpassEndpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  let rawElements = [];
  let lastError = null;

  for (const endpoint of overpassEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
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
          rawElements = data.elements;
          break;
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (rawElements.length === 0 && lastError) {
    console.warn(`[nearbyPlacesService] Overpass query notice: ${lastError.message}`);
  }

  // Parse and normalize elements
  const seenIds = new Set();
  const places = [];

  for (const el of rawElements) {
    const tags = el.tags || {};
    const name = tags.name || tags['name:en'] || tags.brand || tags.operator || '';
    if (!name || name.trim().length === 0) continue;

    const classification = categorizeOsmPlace(tags);
    if (!classification) continue;

    const placeLat = el.lat ?? el.center?.lat;
    const placeLng = el.lon ?? el.center?.lon;
    if (typeof placeLat !== 'number' || typeof placeLng !== 'number') continue;

    const placeId = `osm_${el.type}_${el.id}`;
    if (seenIds.has(placeId)) continue;
    seenIds.add(placeId);

    const distanceMeters = haversineDistance(lat, lng, placeLat, placeLng);

    // Build street address / location subtitle
    const street = tags['addr:street'] ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}`.trim() : '';
    const suburb = tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:city'] || '';
    const address = street && suburb ? `${street}, ${suburb}` : street || suburb || tags.description || '';

    places.push({
      id: placeId,
      name: name.trim(),
      category: classification.category,
      subcategory: classification.subcategory,
      latitude: placeLat,
      longitude: placeLng,
      distanceMeters,
      distanceText: formatDistance(distanceMeters),
      address: address.trim(),
      tags: {
        amenity: tags.amenity,
        railway: tags.railway,
        shop: tags.shop,
        cuisine: tags.cuisine,
        phone: tags.phone || tags['contact:phone'],
        website: tags.website || tags['contact:website'],
      },
    });
  }

  // Sort by nearest to farthest
  places.sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Store in cache
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
  // Input validations
  if (
    typeof originLat !== 'number' ||
    typeof originLng !== 'number' ||
    typeof destLat !== 'number' ||
    typeof destLng !== 'number'
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
          geometry: route.geometry, // GeoJSON LineString coordinates: [[lng, lat], ...]
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
