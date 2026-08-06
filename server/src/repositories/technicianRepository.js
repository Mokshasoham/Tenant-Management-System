/**
 * server/src/repositories/technicianRepository.js
 * Repository layer for Technician Management (Extending User model with role='technician').
 */

import User from '../models/User.js';

export class TechnicianRepository {
  async create(data) {
    const technicianData = {
      ...data,
      role: 'technician',
      technicianProfile: data.technicianProfile || {
        employeeId: `TECH-${Math.floor(1000 + Math.random() * 9000)}`,
        employmentStatus: 'active',
        employmentType: 'full_time',
        availabilityStatus: 'free',
        liveStatus: 'online'
      }
    };
    return await User.create(technicianData);
  }

  async findById(id) {
    return await User.findOne({ _id: id, role: 'technician' })
      .select('-password')
      .populate('technicianProfile.territory.properties', 'name address');
  }

  async findWithFilters(filter = {}, skip = 0, limit = 50) {
    const query = { role: 'technician', ...filter };
    return await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('technicianProfile.territory.properties', 'name address');
  }

  async countWithFilters(filter = {}) {
    return await User.countDocuments({ role: 'technician', ...filter });
  }

  async update(id, data) {
    return await User.findOneAndUpdate(
      { _id: id, role: 'technician' },
      { $set: data },
      { new: true, runValidators: true }
    ).select('-password');
  }

  async updateStatus(id, availabilityStatus, liveStatus) {
    const updateData = {};
    if (availabilityStatus) updateData['technicianProfile.availabilityStatus'] = availabilityStatus;
    if (liveStatus) updateData['technicianProfile.liveStatus'] = liveStatus;

    return await User.findOneAndUpdate(
      { _id: id, role: 'technician' },
      { $set: updateData },
      { new: true }
    ).select('-password');
  }

  async delete(id) {
    return await User.findOneAndDelete({ _id: id, role: 'technician' });
  }
}

const technicianRepository = new TechnicianRepository();
export default technicianRepository;
