export const getDisplayStatus = (property) => {
    if (!property) return 'Available';
    if (property.displayStatus) {
        return property.displayStatus.replace(/, \d{4}$/, '');
    }
    
    // Frontend fallback calculation
    if (property.status === 'maintenance') {
        return 'Under Maintenance';
    }
    
    // Find active lease
    const activeLease = property.activeLease || property.leases?.find(l => l && l.status === 'active');
    if (activeLease && activeLease.endDate) {
        const endDate = new Date(activeLease.endDate);
        if (endDate > new Date()) {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const day = endDate.getDate();
            const month = monthNames[endDate.getMonth()];
            return `Available from ${day} ${month}`;
        }
    }
    
    if (property.status === 'occupied' || property.status === 'rented') {
        return 'Sold Out';
    }
    
    return 'Available';
};
