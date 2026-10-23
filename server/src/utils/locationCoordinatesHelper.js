/**
 * Location Coordinates Helper (Server & Shared)
 * Comprehensive dictionary of Indian states, Union Territories, and major cities with coordinates.
 * Supports case-insensitive lookup, whitespace trimming, alias matching, and address scanning.
 */

export const DEFAULT_COORDINATES = { lat: 12.9716, lng: 77.5946 }; // Bengaluru default

export const INDIAN_STATES_COORDINATES = {
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
  'Ladakh': { lat: 34.1526, lng: 77.5771 },
  'Andaman & Nicobar Islands': { lat: 11.7401, lng: 92.6586 },
  'Dadra & Nagar Haveli and Daman & Diu': { lat: 20.4283, lng: 72.8397 },
  'Lakshadweep': { lat: 10.5667, lng: 72.6417 },
  'Puducherry': { lat: 11.9416, lng: 79.8083 }
};

export const INDIAN_CITIES_COORDINATES = {
  'Hyderabad': { lat: 17.3850, lng: 78.4867, state: 'Telangana' },
  'Secunderabad': { lat: 17.4399, lng: 78.4983, state: 'Telangana' },
  'Cyberabad': { lat: 17.4435, lng: 78.3772, state: 'Telangana' },
  'Warangal': { lat: 17.9689, lng: 79.5941, state: 'Telangana' },
  'Bengaluru': { lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
  'Bangalore': { lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
  'Mysore': { lat: 12.2958, lng: 76.6394, state: 'Karnataka' },
  'Mysuru': { lat: 12.2958, lng: 76.6394, state: 'Karnataka' },
  'Mangalore': { lat: 12.9141, lng: 74.8560, state: 'Karnataka' },
  'Mangaluru': { lat: 12.9141, lng: 74.8560, state: 'Karnataka' },
  'Hubli': { lat: 15.3647, lng: 75.1240, state: 'Karnataka' },
  'Mumbai': { lat: 19.0760, lng: 72.8777, state: 'Maharashtra' },
  'Bombay': { lat: 19.0760, lng: 72.8777, state: 'Maharashtra' },
  'Pune': { lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
  'Nagpur': { lat: 21.1458, lng: 79.0882, state: 'Maharashtra' },
  'Thane': { lat: 19.2183, lng: 72.9781, state: 'Maharashtra' },
  'Nashik': { lat: 19.9975, lng: 73.7898, state: 'Maharashtra' },
  'Navi Mumbai': { lat: 19.0330, lng: 73.0297, state: 'Maharashtra' },
  'Delhi': { lat: 28.6139, lng: 77.2090, state: 'Delhi' },
  'New Delhi': { lat: 28.6139, lng: 77.2090, state: 'Delhi' },
  'Noida': { lat: 28.5355, lng: 77.3910, state: 'Uttar Pradesh' },
  'Greater Noida': { lat: 28.4744, lng: 77.5040, state: 'Uttar Pradesh' },
  'Ghaziabad': { lat: 28.6692, lng: 77.4538, state: 'Uttar Pradesh' },
  'Gurugram': { lat: 28.4595, lng: 77.0266, state: 'Haryana' },
  'Gurgaon': { lat: 28.4595, lng: 77.0266, state: 'Haryana' },
  'Faridabad': { lat: 28.4089, lng: 77.3178, state: 'Haryana' },
  'Chennai': { lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
  'Madras': { lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
  'Coimbatore': { lat: 11.0168, lng: 76.9558, state: 'Tamil Nadu' },
  'Madurai': { lat: 9.9252, lng: 78.1198, state: 'Tamil Nadu' },
  'Salem': { lat: 11.6643, lng: 78.1460, state: 'Tamil Nadu' },
  'Kolkata': { lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
  'Calcutta': { lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
  'Howrah': { lat: 22.5958, lng: 88.2636, state: 'West Bengal' },
  'Ahmedabad': { lat: 23.0225, lng: 72.5714, state: 'Gujarat' },
  'Surat': { lat: 21.1702, lng: 72.8311, state: 'Gujarat' },
  'Vadodara': { lat: 22.3072, lng: 73.1812, state: 'Gujarat' },
  'Rajkot': { lat: 22.3039, lng: 70.8022, state: 'Gujarat' },
  'Jaipur': { lat: 26.9124, lng: 75.7873, state: 'Rajasthan' },
  'Jodhpur': { lat: 26.2389, lng: 73.0243, state: 'Rajasthan' },
  'Udaipur': { lat: 24.5854, lng: 73.7125, state: 'Rajasthan' },
  'Kota': { lat: 25.2138, lng: 75.8648, state: 'Rajasthan' },
  'Lucknow': { lat: 26.8467, lng: 80.9462, state: 'Uttar Pradesh' },
  'Kanpur': { lat: 26.4499, lng: 80.3319, state: 'Uttar Pradesh' },
  'Varanasi': { lat: 25.3176, lng: 82.9739, state: 'Uttar Pradesh' },
  'Agra': { lat: 27.1767, lng: 78.0081, state: 'Uttar Pradesh' },
  'Prayagraj': { lat: 25.4358, lng: 81.8463, state: 'Uttar Pradesh' },
  'Allahabad': { lat: 25.4358, lng: 81.8463, state: 'Uttar Pradesh' },
  'Patna': { lat: 25.5941, lng: 85.1376, state: 'Bihar' },
  'Ranchi': { lat: 23.3441, lng: 85.3096, state: 'Jharkhand' },
  'Bhubaneswar': { lat: 20.2961, lng: 85.8245, state: 'Odisha' },
  'Cuttack': { lat: 20.4625, lng: 85.8830, state: 'Odisha' },
  'Kochi': { lat: 9.9312, lng: 76.2673, state: 'Kerala' },
  'Cochin': { lat: 9.9312, lng: 76.2673, state: 'Kerala' },
  'Thiruvananthapuram': { lat: 8.5241, lng: 76.9366, state: 'Kerala' },
  'Trivandrum': { lat: 8.5241, lng: 76.9366, state: 'Kerala' },
  'Kozhikode': { lat: 11.2588, lng: 75.7804, state: 'Kerala' },
  'Calicut': { lat: 11.2588, lng: 75.7804, state: 'Kerala' },
  'Indore': { lat: 22.7196, lng: 75.8577, state: 'Madhya Pradesh' },
  'Bhopal': { lat: 23.2599, lng: 77.4126, state: 'Madhya Pradesh' },
  'Gwalior': { lat: 26.2183, lng: 78.1828, state: 'Madhya Pradesh' },
  'Jabalpur': { lat: 23.1815, lng: 79.9864, state: 'Madhya Pradesh' },
  'Raipur': { lat: 21.2514, lng: 81.6296, state: 'Chhattisgarh' },
  'Chandigarh': { lat: 30.7333, lng: 76.7794, state: 'Chandigarh' },
  'Amritsar': { lat: 31.6340, lng: 74.8723, state: 'Punjab' },
  'Ludhiana': { lat: 30.9010, lng: 75.8573, state: 'Punjab' },
  'Jalandhar': { lat: 31.3260, lng: 75.5762, state: 'Punjab' },
  'Dehradun': { lat: 30.3165, lng: 78.0322, state: 'Uttarakhand' },
  'Visakhapatnam': { lat: 17.6868, lng: 83.2185, state: 'Andhra Pradesh' },
  'Vizag': { lat: 17.6868, lng: 83.2185, state: 'Andhra Pradesh' },
  'Vijayawada': { lat: 16.5062, lng: 80.6480, state: 'Andhra Pradesh' },
  'Guntur': { lat: 16.3067, lng: 80.4365, state: 'Andhra Pradesh' },
  'Guwahati': { lat: 26.1445, lng: 91.7362, state: 'Assam' },
  'Srinagar': { lat: 34.0837, lng: 74.7973, state: 'Jammu & Kashmir' },
  'Panaji': { lat: 15.4909, lng: 73.8278, state: 'Goa' },
  'Goa': { lat: 15.4909, lng: 73.8278, state: 'Goa' }
};

export const COMBINED_COORDS_MAP = {
  ...INDIAN_STATES_COORDINATES,
  ...INDIAN_CITIES_COORDINATES
};

/**
 * Resolves coordinates from an input string (city, state, or full address).
 * Performs exact normalized lookup first, followed by word-boundary scanning across major cities & states.
 */
export function resolveCoordinatesFromInput(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Direct case-insensitive match against cities
  const cityKey = Object.keys(INDIAN_CITIES_COORDINATES).find(
    k => k.toLowerCase() === trimmed.toLowerCase()
  );
  if (cityKey) {
    const data = INDIAN_CITIES_COORDINATES[cityKey];
    return {
      lat: data.lat,
      lng: data.lng,
      matchedName: cityKey,
      state: data.state || '',
      type: 'city',
      confidence: 'exact'
    };
  }

  // 2. Direct case-insensitive match against states
  const stateKey = Object.keys(INDIAN_STATES_COORDINATES).find(
    k => k.toLowerCase() === trimmed.toLowerCase()
  );
  if (stateKey) {
    const data = INDIAN_STATES_COORDINATES[stateKey];
    return {
      lat: data.lat,
      lng: data.lng,
      matchedName: stateKey,
      state: stateKey,
      type: 'state',
      confidence: 'exact'
    };
  }

  // 3. Scan string for city names (e.g., "Kukatpally, Hyderabad", "Plot 42, Hitech City, Hyderabad, 500081")
  const sortedCityKeys = Object.keys(INDIAN_CITIES_COORDINATES).sort((a, b) => b.length - a.length);
  const lowerInput = trimmed.toLowerCase();

  for (const cKey of sortedCityKeys) {
    const regex = new RegExp(`(^|[\\s,;./-])${cKey.toLowerCase()}([\\s,;./-]|$)`, 'i');
    if (regex.test(lowerInput)) {
      const data = INDIAN_CITIES_COORDINATES[cKey];
      return {
        lat: data.lat,
        lng: data.lng,
        matchedName: cKey,
        state: data.state || '',
        type: 'city',
        confidence: 'scanned'
      };
    }
  }

  // 4. Scan string for state names
  const sortedStateKeys = Object.keys(INDIAN_STATES_COORDINATES).sort((a, b) => b.length - a.length);
  for (const sKey of sortedStateKeys) {
    const regex = new RegExp(`(^|[\\s,;./-])${sKey.toLowerCase()}([\\s,;./-]|$)`, 'i');
    if (regex.test(lowerInput)) {
      const data = INDIAN_STATES_COORDINATES[sKey];
      return {
        lat: data.lat,
        lng: data.lng,
        matchedName: sKey,
        state: sKey,
        type: 'state',
        confidence: 'scanned'
      };
    }
  }

  return null;
}

/**
 * Checks if coordinates correspond to the default Bengaluru fallback (within 0.001 degree tolerance).
 */
export function isDefaultCoordinates(lat, lng) {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (isNaN(nLat) || isNaN(nLng)) return false;
  return Math.abs(nLat - DEFAULT_COORDINATES.lat) < 0.001 && Math.abs(nLng - DEFAULT_COORDINATES.lng) < 0.001;
}
