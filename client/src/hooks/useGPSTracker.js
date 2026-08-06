import { useState, useEffect, useRef, useCallback } from 'react';
import { technicianPortalService } from '../services/api';

/**
 * React custom hook to track high-accuracy GPS browser location
 * and periodically report location telemetry to the backend every 30 seconds.
 *
 * @returns {Object} { coords, error, isTracking, startTracking, stopTracking }
 */
export function useGPSTracker(autoStart = false) {
  const [coords, setCoords] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    speed: null,
    heading: null,
  });
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const coordsRef = useRef(coords);
  const watchIdRef = useRef(null);
  const intervalIdRef = useRef(null);

  // Sync coords ref
  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  const sendTelemetry = useCallback(async () => {
    const currentCoords = coordsRef.current;
    if (currentCoords.latitude !== null && currentCoords.longitude !== null) {
      try {
        await technicianPortalService.updateLocationTelemetry({
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          accuracy: currentCoords.accuracy,
          speed: currentCoords.speed,
          heading: currentCoords.heading,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[useGPSTracker] Failed to send location telemetry:', err);
      }
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setError(null);
    setIsTracking(true);

    // 1. Start browser position watcher
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
        };
        setCoords(newCoords);
        coordsRef.current = newCoords;
        setError(null);
      },
      (err) => {
        let msg = 'Failed to retrieve location.';
        if (err.code === 1) msg = 'Location permission denied by user.';
        else if (err.code === 2) msg = 'Position unavailable.';
        else if (err.code === 3) msg = 'Location request timed out.';
        setError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    // 2. Clear any existing telemetry interval and start a new 30-second interval
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
    }

    intervalIdRef.current = setInterval(() => {
      sendTelemetry();
    }, 30000);
  }, [sendTelemetry]);

  // Handle autoStart & cleanup
  useEffect(() => {
    if (autoStart) {
      startTracking();
    }
    return () => {
      stopTracking();
    };
  }, [autoStart, startTracking, stopTracking]);

  return {
    coords,
    error,
    isTracking,
    startTracking,
    stopTracking,
  };
}

export default useGPSTracker;
