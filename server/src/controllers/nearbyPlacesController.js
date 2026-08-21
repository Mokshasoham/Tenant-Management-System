import asyncHandler from 'express-async-handler';
import Property from '../models/Property.js';
import {
  getPropertyCoordinates,
  fetchNearbyPlaces,
  fetchCityPlaces,
  getDrivingRoute,
} from '../services/nearbyPlacesService.js';

/**
 * GET /api/properties/:id/nearby
 * Authenticated endpoint to retrieve nearby places around a specific property.
 */
export const getNearbyPlaces = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id).select(
    'name address city state country location geo status'
  );

  if (!property) {
    return res.status(404).json({
      success: false,
      reason: 'NOT_FOUND',
      message: 'Property not found.',
    });
  }

  // Extract and validate property coordinates
  const coords = getPropertyCoordinates(property);

  if (!coords.valid) {
    return res.status(200).json({
      success: false,
      reason: 'LOCATION_UNAVAILABLE',
      message: 'Property location coordinates are missing or invalid.',
      property: {
        id: property._id,
        name: property.name,
        address: property.address,
        city: property.city,
      },
      total: 0,
      places: [],
    });
  }

  const category = (req.query.category || 'all').toLowerCase();
  const radius = Math.min(25000, Math.max(1000, Number(req.query.radius) || 8000));

  try {
    const places = await fetchNearbyPlaces(
      property._id,
      coords.latitude,
      coords.longitude,
      category,
      radius
    );

    // Development logging for observability
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[NearbyPlaces] property="${property.name}" (${property._id}) lat=${coords.latitude} lng=${coords.longitude} category=${category} radius=${radius} results=${places.length}`
      );
    }

    res.status(200).json({
      success: true,
      reason: places.length === 0 ? 'NO_RESULTS' : 'OK',
      property: {
        id: property._id,
        name: property.name,
        address: property.address,
        city: property.city,
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
      category,
      total: places.length,
      places,
    });
  } catch (err) {
    console.error(`[nearbyPlacesController] Error fetching nearby places for ${property._id}:`, err);
    res.status(200).json({
      success: false,
      reason: 'PROVIDER_UNAVAILABLE',
      message: 'Nearby places service is temporarily busy. Please retry.',
      property: {
        id: property._id,
        name: property.name,
        address: property.address,
        city: property.city,
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
      total: 0,
      places: [],
    });
  }
});

/**
 * GET /api/properties/:id/city-places
 * Endpoint to retrieve wider city-level places for a specific category (radius up to 25km).
 */
export const getCityPlaces = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id).select(
    'name address city state country location geo status'
  );

  if (!property) {
    return res.status(404).json({
      success: false,
      reason: 'NOT_FOUND',
      message: 'Property not found.',
    });
  }

  const coords = getPropertyCoordinates(property);

  if (!coords.valid) {
    return res.status(200).json({
      success: false,
      reason: 'LOCATION_UNAVAILABLE',
      message: 'Property location coordinates are missing or invalid.',
      property: {
        id: property._id,
        name: property.name,
        address: property.address,
        city: property.city,
      },
      total: 0,
      places: [],
    });
  }

  const category = (req.query.category || 'all').toLowerCase();
  const radius = Math.min(30000, Math.max(5000, Number(req.query.radius) || 15000));

  try {
    const places = await fetchCityPlaces(
      property._id,
      coords.latitude,
      coords.longitude,
      category,
      radius
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[CityPlaces] property="${property.name}" (${property._id}) category=${category} radius=${radius} results=${places.length}`
      );
    }

    res.status(200).json({
      success: true,
      reason: places.length === 0 ? 'NO_RESULTS' : 'OK',
      property: {
        id: property._id,
        name: property.name,
        address: property.address,
        city: property.city,
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
      category,
      radius,
      total: places.length,
      places,
    });
  } catch (err) {
    console.error(`[nearbyPlacesController] Error fetching city places for ${property._id}:`, err);
    res.status(200).json({
      success: false,
      reason: 'PROVIDER_UNAVAILABLE',
      message: 'City discovery service is temporarily busy. Please retry.',
      property: {
        id: property._id,
        name: property.name,
        address: property.address,
        city: property.city,
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
      total: 0,
      places: [],
    });
  }
});

/**
 * GET /api/properties/:id/route
 * Authenticated endpoint to compute driving route geometry and road distance to a destination.
 */
export const getRoute = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id).select(
    'name address city state location geo'
  );

  if (!property) {
    return res.status(404).json({
      success: false,
      reason: 'NOT_FOUND',
      message: 'Property not found.',
    });
  }

  const coords = getPropertyCoordinates(property);

  if (!coords.valid) {
    return res.status(400).json({
      success: false,
      reason: 'LOCATION_UNAVAILABLE',
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
    destLng > 180 ||
    (destLat === 0 && destLng === 0)
  ) {
    return res.status(400).json({
      success: false,
      reason: 'INVALID_DESTINATION',
      message: 'Valid destination latitude (-90..90) and longitude (-180..180) are required.',
    });
  }

  try {
    const routeResult = await getDrivingRoute(
      coords.latitude,
      coords.longitude,
      destLat,
      destLng
    );

    res.status(200).json({
      success: true,
      origin: {
        id: property._id,
        name: property.name,
        latitude: coords.latitude,
        longitude: coords.longitude,
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
      reason: 'ROUTE_FAILED',
      message: 'Route calculation failed. Direct navigation is still available via maps.',
    });
  }
});
