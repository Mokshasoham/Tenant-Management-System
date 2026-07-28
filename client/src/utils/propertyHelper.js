export const getDisplayStatus = (property) => {
    if (!property) return 'Available';
    if (property.displayStatus) {
        return property.displayStatus.replace(/, \d{4}$/, '');
    }
    
    // Frontend fallback calculation
    if (property.status === 'maintenance') {
        return 'Under Maintenance';
    }
    
    if (property.status === 'occupied' || property.status === 'rented') {
        // 1. Try to find the active lease
        const activeLease = property.activeLease || property.leases?.find(l => l && l.status === 'active');
        let targetDate = activeLease?.endDate ? new Date(activeLease.endDate) : null;
        
        // 2. If no active lease, try any lease
        if (!targetDate && property.leases && property.leases.length > 0) {
            const sortedLeases = [...property.leases].sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
            if (sortedLeases[0]?.endDate) {
                targetDate = new Date(sortedLeases[0].endDate);
            }
        }
        
        // 3. If still no date, calculate fallback (6 months from property creation)
        if (!targetDate) {
            const baseDate = property.createdAt ? new Date(property.createdAt) : new Date();
            targetDate = new Date(baseDate.getTime() + 180 * 24 * 60 * 60 * 1000);
        }
        
        // 4. If the resolved date is in the past, push it to 30 days from today
        if (targetDate <= new Date()) {
            targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = targetDate.getDate();
        const month = monthNames[targetDate.getMonth()];
        return `Available from ${day} ${month}`;
    }
    
    return 'Available';
};
