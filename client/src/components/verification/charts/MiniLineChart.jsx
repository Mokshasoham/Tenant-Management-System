import React from 'react';

export const MiniLineChart = ({ dataPoints = [], height = 60, color = '#10b981' }) => {
  if (dataPoints.length === 0) return null;

  const maxVal = Math.max(...dataPoints.map((d) => d.value), 100);
  const minVal = Math.min(...dataPoints.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;

  const points = dataPoints
    .map((d, i) => {
      const x = (i / (dataPoints.length - 1 || 1)) * 200;
      const y = height - ((d.value - minVal) / range) * (height - 10) - 5;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="w-full">
      <svg viewBox={`0 0 200 ${height}`} className="w-full overflow-visible">
        <polyline fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" points={points} />
        {dataPoints.map((d, i) => {
          const x = (i / (dataPoints.length - 1 || 1)) * 200;
          const y = height - ((d.value - minVal) / range) * (height - 10) - 5;
          return <circle key={i} cx={x} cy={y} r="4" fill={color} className="transition-all hover:r-6" />;
        })}
      </svg>
    </div>
  );
};

export default MiniLineChart;
