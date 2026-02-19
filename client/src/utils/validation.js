import { z } from 'zod';

// User schemas
export const userSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[@$!%*?&]/, 'Password must contain special character'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Tenant schemas
export const tenantSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().min(5),
  idNumber: z.string().optional(),
  occupationStatus: z.enum(['employed', 'self-employed', 'student', 'retired', 'other']).optional(),
  monthlyIncome: z.number().positive().optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
  }).optional(),
});

// Property schemas
export const propertySchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  type: z.enum(['apartment', 'house', 'commercial', 'land']),
  bedrooms: z.number().nonnegative().optional(),
  bathrooms: z.number().nonnegative().optional(),
  squareFeet: z.number().positive(),
  rentAmount: z.number().positive(),
  depositAmount: z.number().nonnegative().optional(),
  amenities: z.array(z.string()).optional(),
  description: z.string().optional(),
});

// Lease schemas
export const leaseSchema = z.object({
  propertyId: z.string(),
  tenantId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  rentAmount: z.number().positive(),
  depositAmount: z.number().nonnegative().optional(),
  utilities: z.object({
    water: z.boolean().optional(),
    electricity: z.boolean().optional(),
    gas: z.boolean().optional(),
    internet: z.boolean().optional(),
  }).optional(),
  terms: z.string().optional(),
});

// Payment schemas
export const paymentSchema = z.object({
  leaseId: z.string(),
  tenantId: z.string(),
  propertyId: z.string(),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  paymentMethod: z.enum(['cash', 'check', 'transfer', 'card', 'other']).optional(),
  reference: z.string().optional(),
});

export default {
  userSchema,
  loginSchema,
  tenantSchema,
  propertySchema,
  leaseSchema,
  paymentSchema,
};
