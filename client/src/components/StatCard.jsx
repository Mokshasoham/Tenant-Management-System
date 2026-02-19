import React from 'react';

export default function StatCard({ title, value, icon: Icon, color, textColor, loading }) {
  return (
    <div className={`${color} rounded-lg p-6 border border-gray-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          {loading ? (
            <div className="h-8 bg-gray-300 rounded mt-2 w-16 animate-pulse" />
          ) : (
            <p className={`${textColor} text-3xl font-bold mt-2`}>{value}</p>
          )}
        </div>
        <Icon className={`w-12 h-12 ${textColor} opacity-20`} />
      </div>
    </div>
  );
}
