import asyncHandler from 'express-async-handler';
import Property from '../models/Property.js';
import { fetchNearbyPlacesFromOverpass, getDrivingRoute } from '../services/nearbyPlacesService.js';

/**
 * GET /api/properties/:id/nearby
 * Authenticated endpoint to retrieve nearby places around a specific property.
 */
export const getNearbyPlaces = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id).select('name address city location status');

  if (!property) {
    return res.status(404).json({
      success: false,
      message: 'Property not found.',
    });
  }

  const lat = property.location?.lat;
  const lng = property.location?.lng;

  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({
      success: false,
      message: 'Nearby places are unavailable because this property has no valid location coordinates.',
    });
  }

  const category = (req.query.category || 'all').toLowerCase();
  const radius = Math.min(25000, Math.max(1000, Number(req.query.radius) || 6000));

  try {
    const allPlaces = await fetchNearbyPlacesFromOverpass(property._id, lat, lng, radius);

    let filtered = allPlaces;
    if (category !== 'all') {
      filtered = allPlaces.filter((p) => p.category === category);
    }

    res.status(200).json({
      success: true,
      property: {
        id: property._id,
        name: property.name,
        address: property.address,
        city: property.city,
        latitude: lat,
        longitude: lng,
      },
      category,
      total: filtered.length,
      places: filtered,
    });
  } catch (err) {
    console.error(`[nearbyPlacesController] Error fetching nearby places for ${property._id}:`, err);
    res.status(502).json({
      success: false,
      message: 'Nearby places service is temporarily unavailable. Please retry shortly.',
    });
  }
});

/**
 * GET /api/properties/:id/route
 * Authenticated endpoint to compute driving route geometry and road distance to a destination.
 */
export const getRoute = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id).select('name address city location');

  if (!property) {
    return res.status(404).json({
      success: false,
      message: 'Property not found.',
    });
  }

  const originLat = property.location?.lat;
  const originLng = property.location?.lng;

  if (typeof originLat !== 'number' || typeof originLng !== 'number' || isNaN(originLat) || isNaN(originLng)) {
    return res.status(400).json({
      success: false,
      message: 'Property origin coordinates are missing or invalid.',
    });
  }

  const destLat = Number(req.query.destLat);
  const destLng = Number(req.query.destLng);
  const destName = req.query.destName ? String(req.query.destName).trim() : 'Destination Place';

  if (
    isNaN(destLat) ||
    isNaN(destLng) ||
    destLat < -90 ||
    destLat > 90 ||
    destLng < -180 ||
    destLng > 180
  ) {
    return res.status(400).json({
      success: false,
      message: 'Valid destination latitude (-90..90) and longitude (-180..180) are required.',
    });
  }

  try {
    const routeResult = await getDrivingRoute(originLat, originLng, destLat, destLng);

    res.status(200).json({
      success: true,
      origin: {
        id: property._id,
        name: property.name,
        latitude: originLat,
        longitude: originLng,
      },
      destination: {
        name: destName,
        latitude: destLat,
        longitude: destLng,
      },
      route: routeResult,
    });
  } catch (err) {
    console.error(`[nearbyPlacesController] Route calculation error:`, err);
    res.status(500).json({
      success: false,
      message: 'Route calculation failed. Direct navigation is still available via maps.',
    });
  }
});
