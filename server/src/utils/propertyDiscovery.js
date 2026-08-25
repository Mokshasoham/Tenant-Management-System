/**
 * Property Discovery & Recommendation Utilities
 * Provides Haversine geographic proximity calculation, location scope labeling,
 * and a multi-signal similarity ranking engine.
 */

/**
 * Calculates Haversine distance between two coordinates in kilometers.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number|null} Distance in km (rounded to 1 decimal place) or null if invalid
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;
  // Basic bounding check for valid lat/lng
  if (Math.abs(nLat1) > 90 || Math.abs(nLat2) > 90 || Math.abs(nLon1) > 180 || Math.abs(nLon2) > 180) {
    return null;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = (nLat2 - nLat1) * (Math.PI / 180);
  const dLon = (nLon2 - nLon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(nLat1 * (Math.PI / 180)) *
      Math.cos(nLat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  
  return Math.round(d * 10) / 10;
}

/**
 * Derives coordinates from property location or geo object.
 */
export function extractPropertyCoords(property) {
  if (!property) return null;
  
  // 1. Direct location object
  if (property.location && typeof property.location.lat === 'number' && typeof property.location.lng === 'number') {
    return { lat: property.location.lat, lng: property.location.lng };
  }

  // 2. 2dsphere GeoJSON [lng, lat]
  if (property.geo && Array.isArray(property.geo.coordinates) && property.geo.coordinates.length === 2) {
    const [lng, lat] = property.geo.coordinates;
    if (typeof lat === 'number' && typeof lng === 'number') {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Returns formatted proximity information and badge for a candidate relative to the target property.
 */
export function getProximityDetails(target, candidate) {
  const targetCoords = extractPropertyCoords(target);
  const candCoords = extractPropertyCoords(candidate);

  let distanceKm = null;
  if (targetCoords && candCoords) {
    distanceKm = calculateDistanceKm(targetCoords.lat, targetCoords.lng, candCoords.lat, candCoords.lng);
  }

  const sameCity = Boolean(
    target.city && candidate.city &&
    target.city.trim().toLowerCase() === candidate.city.trim().toLowerCase()
  );

  const sameState = Boolean(
    target.state && candidate.state &&
    target.state.trim().toLowerCase() === candidate.state.trim().toLowerCase()
  );

  if (distanceKm !== null) {
    let proximityBadge = '';
    let scope = 'nearby';

    if (distanceKm <= 2) {
      proximityBadge = 'Within 2 km';
      scope = 'immediate';
    } else if (distanceKm <= 5) {
      proximityBadge = 'Within 5 km';
      scope = 'nearby';
    } else if (distanceKm <= 15) {
      proximityBadge = 'Within 15 km';
      scope = 'area';
    } else if (sameCity) {
      proximityBadge = `Nearby in ${candidate.city}`;
      scope = 'city';
    } else {
      proximityBadge = `${distanceKm} km away`;
      scope = 'region';
    }

    return {
      distanceKm,
      distanceText: distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm} km`,
      proximityBadge,
      scope,
      hasPreciseDistance: true,
      coords: candCoords
    };
  }

  // Fallback when coordinates are missing
  if (sameCity) {
    return {
      distanceKm: null,
      distanceText: `In ${candidate.city}`,
      proximityBadge: `In ${candidate.city}`,
      scope: 'city',
      hasPreciseDistance: false,
      coords: candCoords
    };
  }

  if (sameState) {
    return {
      distanceKm: null,
      distanceText: `In ${candidate.state}`,
      proximityBadge: `In ${candidate.state}`,
      scope: 'region',
      hasPreciseDistance: false,
      coords: candCoords
    };
  }

  return {
    distanceKm: null,
    distanceText: 'Regional',
    proximityBadge: candidate.city || 'Regional',
    scope: 'region',
    hasPreciseDistance: false,
    coords: candCoords
  };
}

/**
 * Computes multi-signal similarity score between target and candidate properties (0 to 100).
 * Generates descriptive "Why this property?" reason tags.
 */
export function calculateSimilarityScore(target, candidate) {
  let score = 0;
  const matchReasons = [];

  // 1. Property Type Match (Max 25 pts)
  const targetType = (target.type || '').toLowerCase();
  const candType = (candidate.type || '').toLowerCase();
  
  if (targetType && candType && targetType === candType) {
    score += 25;
    matchReasons.push(`Same ${candidate.type} type`);
  } else {
    // Both residential
    const residentialTypes = ['apartment', 'house', 'villa', 'studio', 'room'];
    if (residentialTypes.includes(targetType) && residentialTypes.includes(candType)) {
      score += 12;
    }
  }

  // 2. Bedrooms & Bathrooms Match (Max 20 pts)
  if (target.bedrooms != null && candidate.bedrooms != null) {
    const bDiff = Math.abs(Number(target.bedrooms) - Number(candidate.bedrooms));
    if (bDiff === 0) {
      score += 15;
      matchReasons.push(`${candidate.bedrooms} BHK layout match`);
    } else if (bDiff === 1) {
      score += 8;
    }
  }

  if (target.bathrooms != null && candidate.bathrooms != null) {
    if (Number(target.bathrooms) === Number(candidate.bathrooms)) {
      score += 5;
    }
  }

  // 3. Rent Proximity Match (Max 20 pts)
  if (target.rentAmount && candidate.rentAmount) {
    const tRent = Number(target.rentAmount);
    const cRent = Number(candidate.rentAmount);
    if (tRent > 0 && cRent > 0) {
      const rentDiffRatio = Math.abs(cRent - tRent) / tRent;
      if (rentDiffRatio <= 0.10) {
        score += 20;
        matchReasons.push(`Similar price (₹${cRent.toLocaleString('en-IN')})`);
      } else if (rentDiffRatio <= 0.25) {
        score += 15;
        matchReasons.push(`Close price range`);
      } else if (rentDiffRatio <= 0.40) {
        score += 10;
      } else if (rentDiffRatio <= 0.60) {
        score += 5;
      }
    }
  }

  // 4. Location / City Match (Max 15 pts)
  const targetCity = (target.city || '').trim().toLowerCase();
  const candCity = (candidate.city || '').trim().toLowerCase();
  if (targetCity && candCity && targetCity === candCity) {
    score += 15;
    matchReasons.push(`Located in ${candidate.city}`);
  } else if (target.state && candidate.state && target.state.trim().toLowerCase() === candidate.state.trim().toLowerCase()) {
    score += 8;
  }

  // 5. Size / Square Footage Match (Max 10 pts)
  if (target.squareFeet && candidate.squareFeet) {
    const tSqft = Number(target.squareFeet);
    const cSqft = Number(candidate.squareFeet);
    if (tSqft > 0 && cSqft > 0) {
      const sqftDiffRatio = Math.abs(cSqft - tSqft) / tSqft;
      if (sqftDiffRatio <= 0.15) {
        score += 10;
        matchReasons.push(`Similar area (${cSqft} sqft)`);
      } else if (sqftDiffRatio <= 0.30) {
        score += 6;
      }
    }
  }

  // 6. Furnishing & Amenities Match (Max 10 pts)
  if (target.furnishing && candidate.furnishing && target.furnishing === candidate.furnishing) {
    score += 5;
    matchReasons.push(`${candidate.furnishing} furnishing`);
  }

  if (Array.isArray(target.amenities) && Array.isArray(candidate.amenities)) {
    const targetAmenitiesSet = new Set(target.amenities.map(a => a.toLowerCase().trim()));
    const commonAmenities = candidate.amenities.filter(a => targetAmenitiesSet.has(a.toLowerCase().trim()));
    if (commonAmenities.length >= 3) {
      score += 5;
    } else if (commonAmenities.length >= 1) {
      score += 2;
    }
  }

  // Bonus for verified badge
  if (candidate.verificationStatus === 'verified' || candidate.verifiedBadge) {
    matchReasons.push('Verified listing');
  }

  // Deduplicate and cap reasons to top 3
  const uniqueReasons = Array.from(new Set(matchReasons)).slice(0, 3);

  return {
    score: Math.min(100, Math.round(score)),
    matchReasons: uniqueReasons
  };
}
