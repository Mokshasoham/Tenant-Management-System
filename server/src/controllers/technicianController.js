/**
 * server/src/controllers/technicianController.js
 * Controller for Technician & Workforce Management API endpoints.
 */

import technicianService from '../services/technicianService.js';
import { asyncHandler, AppError } from '../utils/errorHandling.js';

export const getAllTechnicians = asyncHandler(async (req, res) => {
  const result = await technicianService.getAllTechnicians(req.query);
  res.status(200).json({
    success: true,
    data: result.technicians,
    pagination: result.pagination
  });
});

export const getTechnicianById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const technician = await technicianService.getTechnicianById(id);
  res.status(200).json({
    success: true,
    data: technician
  });
});

export const createTechnician = asyncHandler(async (req, res) => {
  const technician = await technicianService.createTechnician(req.body);
  res.status(201).json({
    success: true,
    message: 'Technician profile created successfully',
    data: technician
  });
});

export const updateTechnician = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const technician = await technicianService.updateTechnician(id, req.body);
  res.status(200).json({
    success: true,
    message: 'Technician profile updated successfully',
    data: technician
  });
});

export const deleteTechnician = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await technicianService.deleteTechnician(id);
  res.status(200).json({
    success: true,
    message: 'Technician profile deleted successfully'
  });
});

export const getWorkload = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const workload = await technicianService.getTechnicianWorkload(id);
  res.status(200).json({
    success: true,
    data: workload
  });
});

export const getPerformance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const performance = await technicianService.getTechnicianPerformance(id);
  res.status(200).json({
    success: true,
    data: performance
  });
});

export const getAvailableTechnicians = asyncHandler(async (req, res) => {
  const { skill } = req.query;
  const technicians = await technicianService.getAvailableTechnicians(skill);
  res.status(200).json({
    success: true,
    data: technicians
  });
});

export const searchTechnicians = asyncHandler(async (req, res) => {
  const result = await technicianService.getAllTechnicians({ ...req.query, search: req.query.q });
  res.status(200).json({
    success: true,
    data: result.technicians
  });
});
