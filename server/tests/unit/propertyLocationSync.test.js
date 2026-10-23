/**
 * TMS Property Location & Interactive Map Coordinate Synchronization Test Suite
 *
 * Verifies:
 * 1. Geographic Coordinate Resolution Engine (resolveCoordinatesFromInput & isDefaultCoordinates)
 * 2. Case-Insensitive, Trimmed, and Alias City Matching (e.g., Hyderabad, Bangalore/Bengaluru)
 * 3. Freeform Address Scanning for Embedded Geographic Entities
 * 4. Model and Controller GeoJSON 2dsphere [lng, lat] & location { lat, lng } Synchronization
 * 5. Coercion of String / Numeric Coordinate Payloads in Create & Update Workflows
 * 6. Protection Against Arbitrary Coordinate Overwrite and Coordinate Boundary Validation
 */

import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import {
  DEFAULT_COORDINATES,
  INDIAN_CITIES_COORDINATES,
  INDIAN_STATES_COORDINATES,
  COMBINED_COORDS_MAP,
  resolveCoordinatesFromInput,
  isDefaultCoordinates
} from '../../src/utils/locationCoordinatesHelper.js';
import Property from '../../src/models/Property.js';
import * as propertyController from '../../src/controllers/propertyController.js';

describe('TMS Property Location & Interactive Map Coordinate Synchronization Test Suite', () => {

  describe('1. Geographic Coordinate Resolution Engine (locationCoordinatesHelper.js)', () => {
    it('1.1 should resolve exact city name to accurate coordinates (Hyderabad)', () => {
      const result = resolveCoordinatesFromInput('Hyderabad');
      expect(result).not.toBeNull();
      expect(result.lat).toBe(17.3850);
      expect(result.lng).toBe(78.4867);
      expect(result.matchedName).toBe('Hyderabad');
      expect(result.state).toBe('Telangana');
      expect(result.type).toBe('city');
      expect(result.confidence).toBe('exact');
    });

    it('1.2 should resolve city case-insensitively and ignore leading/trailing whitespace', () => {
      const lowerResult = resolveCoordinatesFromInput('  hyderabad  ');
      expect(lowerResult).not.toBeNull();
      expect(lowerResult.lat).toBe(17.3850);
      expect(lowerResult.lng).toBe(78.4867);

      const upperResult = resolveCoordinatesFromInput('PUNE');
      expect(upperResult).not.toBeNull();
      expect(upperResult.lat).toBe(18.5204);
      expect(upperResult.lng).toBe(73.8567);
    });

    it('1.3 should resolve city aliases accurately (Bangalore -> Bengaluru, Bombay -> Mumbai)', () => {
      const bangalore = resolveCoordinatesFromInput('Bangalore');
      expect(bangalore).not.toBeNull();
      expect(bangalore.lat).toBe(12.9716);
      expect(bangalore.lng).toBe(77.5946);

      const bombay = resolveCoordinatesFromInput('Bombay');
      expect(bombay).not.toBeNull();
      expect(bombay.lat).toBe(19.0760);
      expect(bombay.lng).toBe(72.8777);

      const gurgaon = resolveCoordinatesFromInput('Gurgaon');
      expect(gurgaon).not.toBeNull();
      expect(gurgaon.lat).toBe(28.4595);
      expect(gurgaon.lng).toBe(77.0266);
    });

    it('1.4 should resolve state names accurately (Telangana, Karnataka, Maharashtra)', () => {
      const telangana = resolveCoordinatesFromInput('Telangana');
      expect(telangana).not.toBeNull();
      expect(telangana.lat).toBe(18.1124);
      expect(telangana.lng).toBe(79.0193);
      expect(telangana.type).toBe('state');

      const karnataka = resolveCoordinatesFromInput('Karnataka');
      expect(karnataka).not.toBeNull();
      expect(karnataka.lat).toBe(15.3173);
      expect(karnataka.lng).toBe(75.7139);
    });

    it('1.5 should scan freeform address text and extract embedded city name (Hyderabad)', () => {
      const address1 = 'Plot 42, Hitec City, Hyderabad, 500081';
      const scan1 = resolveCoordinatesFromInput(address1);
      expect(scan1).not.toBeNull();
      expect(scan1.lat).toBe(17.3850);
      expect(scan1.lng).toBe(78.4867);
      expect(scan1.matchedName).toBe('Hyderabad');
      expect(scan1.confidence).toBe('scanned');

      const address2 = 'Flat 302, Kukatpally, Hyderabad';
      const scan2 = resolveCoordinatesFromInput(address2);
      expect(scan2).not.toBeNull();
      expect(scan2.lat).toBe(17.3850);
      expect(scan2.lng).toBe(78.4867);

      const address3 = 'Villa 14, Whitefield, Bengaluru, Karnataka';
      const scan3 = resolveCoordinatesFromInput(address3);
      expect(scan3).not.toBeNull();
      expect(scan3.lat).toBe(12.9716);
      expect(scan3.lng).toBe(77.5946);
    });

    it('1.6 should scan address and match state if no city matches', () => {
      const highwayAddress = 'National Highway 44, Telangana, India';
      const scan = resolveCoordinatesFromInput(highwayAddress);
      expect(scan).not.toBeNull();
      expect(scan.lat).toBe(18.1124);
      expect(scan.lng).toBe(79.0193);
      expect(scan.matchedName).toBe('Telangana');
      expect(scan.type).toBe('state');
    });

    it('1.7 should return null safely for unrecognized or empty inputs', () => {
      expect(resolveCoordinatesFromInput('')).toBeNull();
      expect(resolveCoordinatesFromInput(null)).toBeNull();
      expect(resolveCoordinatesFromInput(undefined)).toBeNull();
      expect(resolveCoordinatesFromInput('Random Nonexistent Location 99999')).toBeNull();
    });
  });

  describe('2. Default Coordinate Detection Engine (isDefaultCoordinates)', () => {
    it('2.1 should detect default Bengaluru coordinates accurately', () => {
      expect(isDefaultCoordinates(12.9716, 77.5946)).toBe(true);
      expect(isDefaultCoordinates('12.9716', '77.5946')).toBe(true);
      expect(isDefaultCoordinates(12.9716001, 77.5946002)).toBe(true);
    });

    it('2.2 should return false for Hyderabad or other custom coordinates', () => {
      expect(isDefaultCoordinates(17.3850, 78.4867)).toBe(false);
      expect(isDefaultCoordinates(19.0760, 72.8777)).toBe(false);
      expect(isDefaultCoordinates(0, 0)).toBe(false);
    });

    it('2.3 should return false for null, undefined, or NaN coordinates', () => {
      expect(isDefaultCoordinates(null, null)).toBe(false);
      expect(isDefaultCoordinates(undefined, undefined)).toBe(false);
      expect(isDefaultCoordinates('invalid', 'coords')).toBe(false);
    });
  });

  describe('3. Controller & Model Location and GeoJSON 2dsphere Synchronization', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    const createChainedQuery = (resolvedValue) => {
      const query = {
        populate: jest.fn().mockImplementation(() => query),
        then: (resolve, reject) => Promise.resolve(resolvedValue).then(resolve, reject),
        exec: jest.fn().mockResolvedValue(resolvedValue)
      };
      return query;
    };

    const createMockReq = (overrides = {}) => ({
      headers: {},
      get: jest.fn().mockReturnValue('localhost:5000'),
      protocol: 'http',
      ...overrides
    });

    it('3.1 should synchronize numeric coordinates into both location {lat, lng} and geo.coordinates [lng, lat] on createProperty', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const req = createMockReq({
        user: { _id: ownerId, role: 'admin' },
        body: {
          name: 'Hyderabad Luxury Residency',
          address: 'Gachibowli, Hyderabad',
          city: 'Hyderabad',
          state: 'Telangana',
          type: 'apartment',
          rentAmount: 35000,
          location: { lat: 17.3850, lng: 78.4867 }
        }
      });

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      let capturedCreatePayload = null;
      jest.spyOn(Property, 'create').mockImplementation(async (data) => {
        capturedCreatePayload = data;
        return {
          _id: new mongoose.Types.ObjectId(),
          ...data
        };
      });

      const populatedDoc = {
        _id: new mongoose.Types.ObjectId(),
        name: req.body.name,
        location: { lat: 17.3850, lng: 78.4867 },
        geo: { type: 'Point', coordinates: [78.4867, 17.3850] },
        owner: { _id: ownerId, firstName: 'Admin', lastName: 'User', role: 'admin' },
        manager: { _id: ownerId, firstName: 'Admin', lastName: 'User', role: 'admin' }
      };

      jest.spyOn(Property, 'findById').mockReturnValue(createChainedQuery(populatedDoc));

      await propertyController.createProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(capturedCreatePayload).not.toBeNull();
      expect(capturedCreatePayload.location).toEqual({ lat: 17.3850, lng: 78.4867 });
      expect(capturedCreatePayload.geo).toEqual({
        type: 'Point',
        coordinates: [78.4867, 17.3850] // GeoJSON requires [longitude, latitude]
      });
    });

    it('3.2 should safely parse and coerce string coordinate inputs to numbers on createProperty', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const req = createMockReq({
        user: { _id: ownerId, role: 'admin' },
        body: {
          name: 'String Coordinates Apartment',
          address: 'Banjara Hills, Hyderabad',
          city: 'Hyderabad',
          state: 'Telangana',
          type: 'apartment',
          rentAmount: 40000,
          location: { lat: '17.3850', lng: '78.4867' } // String format from HTML input
        }
      });

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      let capturedCreatePayload = null;
      jest.spyOn(Property, 'create').mockImplementation(async (data) => {
        capturedCreatePayload = data;
        return { _id: new mongoose.Types.ObjectId(), ...data };
      });

      const populatedDoc = {
        _id: new mongoose.Types.ObjectId(),
        name: req.body.name,
        location: { lat: 17.3850, lng: 78.4867 },
        geo: { type: 'Point', coordinates: [78.4867, 17.3850] },
        owner: { _id: ownerId, firstName: 'Admin', lastName: 'User', role: 'admin' }
      };

      jest.spyOn(Property, 'findById').mockReturnValue(createChainedQuery(populatedDoc));

      await propertyController.createProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(typeof capturedCreatePayload.location.lat).toBe('number');
      expect(typeof capturedCreatePayload.location.lng).toBe('number');
      expect(capturedCreatePayload.location.lat).toBe(17.3850);
      expect(capturedCreatePayload.location.lng).toBe(78.4867);
      expect(capturedCreatePayload.geo.coordinates).toEqual([78.4867, 17.3850]);
    });

    it('3.3 should synchronize coordinates on updateProperty when updating existing property', async () => {
      const propId = new mongoose.Types.ObjectId();
      const managerId = new mongoose.Types.ObjectId();

      const existingProperty = {
        _id: propId,
        name: 'Existing Test Property',
        address: 'Old Address',
        location: { lat: 12.9716, lng: 77.5946 }, // Old Bangalore coordinates
        geo: { type: 'Point', coordinates: [77.5946, 12.9716] },
        manager: managerId,
        owner: managerId,
        rentAmount: 25000
      };

      jest.spyOn(Property, 'findById').mockResolvedValue(existingProperty);

      let capturedUpdateData = null;
      jest.spyOn(Property, 'findByIdAndUpdate').mockImplementation((id, data) => {
        capturedUpdateData = data;
        const updatedDoc = {
          ...existingProperty,
          ...data,
          owner: { _id: managerId, firstName: 'Manager', lastName: 'User' },
          manager: { _id: managerId, firstName: 'Manager', lastName: 'User' }
        };
        return createChainedQuery(updatedDoc);
      });

      const req = createMockReq({
        params: { id: propId.toString() },
        user: { _id: managerId, role: 'manager' },
        body: {
          address: 'Kukatpally, Hyderabad',
          city: 'Hyderabad',
          state: 'Telangana',
          location: { lat: 17.3850, lng: 78.4867 } // New Hyderabad coordinates
        }
      });

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await propertyController.updateProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(capturedUpdateData).not.toBeNull();
      expect(capturedUpdateData.location).toEqual({ lat: 17.3850, lng: 78.4867 });
      expect(capturedUpdateData.geo).toEqual({
        type: 'Point',
        coordinates: [78.4867, 17.3850]
      });
    });

    it('3.4 should preserve existing coordinates when update request does not include location', async () => {
      const propId = new mongoose.Types.ObjectId();
      const managerId = new mongoose.Types.ObjectId();

      const existingProperty = {
        _id: propId,
        name: 'Preserved Coordinates Villa',
        address: 'Banjara Hills, Hyderabad',
        location: { lat: 17.3850, lng: 78.4867 },
        geo: { type: 'Point', coordinates: [78.4867, 17.3850] },
        manager: managerId,
        owner: managerId,
        rentAmount: 50000
      };

      jest.spyOn(Property, 'findById').mockResolvedValue(existingProperty);

      let capturedUpdateData = null;
      jest.spyOn(Property, 'findByIdAndUpdate').mockImplementation((id, data) => {
        capturedUpdateData = data;
        const updatedDoc = {
          ...existingProperty,
          ...data,
          owner: { _id: managerId, firstName: 'Manager', lastName: 'User' },
          manager: { _id: managerId, firstName: 'Manager', lastName: 'User' }
        };
        return createChainedQuery(updatedDoc);
      });

      const req = createMockReq({
        params: { id: propId.toString() },
        user: { _id: managerId, role: 'manager' },
        body: {
          name: 'Renamed Villa without Location Field',
          rentAmount: 55000
        }
      });

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await propertyController.updateProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(capturedUpdateData.name).toBe('Renamed Villa without Location Field');
      expect(capturedUpdateData.location).toBeUndefined();
      expect(capturedUpdateData.geo).toBeUndefined();
    });

    it('3.5 should reject invalid out-of-boundary coordinates without creating corrupted geo points', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const req = createMockReq({
        user: { _id: ownerId, role: 'admin' },
        body: {
          name: 'Corrupted Coordinates Listing',
          address: 'Invalid Latitude',
          rentAmount: 20000,
          type: 'apartment',
          location: { lat: 195.0, lng: 78.4867 } // Latitude > 90 is mathematically impossible
        }
      });

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      let capturedCreatePayload = null;
      jest.spyOn(Property, 'create').mockImplementation(async (data) => {
        capturedCreatePayload = data;
        return { _id: new mongoose.Types.ObjectId(), ...data };
      });

      const populatedDoc = {
        _id: new mongoose.Types.ObjectId(),
        name: req.body.name,
        owner: { _id: ownerId, role: 'admin' }
      };

      jest.spyOn(Property, 'findById').mockReturnValue(createChainedQuery(populatedDoc));

      await propertyController.createProperty(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      // Because lat was 195.0 (> 90), geo Point must NOT be created with invalid coordinates
      expect(capturedCreatePayload.geo).toBeUndefined();
    });
  });
});
