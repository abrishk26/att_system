import React from 'react';

interface AttendanceSummaryCardProps {
  label: string;
  value: string | number;
}

export const AttendanceSummaryCard: React.FC<AttendanceSummaryCardProps> = ({ label, value }) => {
  return (
    <div className="bg-gray-100 p-4 rounded-lg text-center">
      <p className="text-3xl font-bold text-blue-600">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
    </div>
  );
};
