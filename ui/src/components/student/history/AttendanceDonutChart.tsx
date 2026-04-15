import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import './AttendanceDonutChart.css';

interface ChartData {
  name: string;
  value: number;
  fill: string;
}

interface AttendanceDonutChartProps {
  data: ChartData[];
  total: number;
}

export const AttendanceDonutChart: React.FC<AttendanceDonutChartProps> = ({ data, total }) => {

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
          const { name, value } = payload[0];
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
          return (
            <div className="rounded-md border border-[var(--aau-border)] bg-white p-2 text-sm shadow-[var(--aau-shadow)]">
              <p>{`${name}: ${value} (${percentage}%)`}</p>
            </div>
          );
        }
        return null;
      };

  return (
    <div className="attendance-donut-chart-container">
        <ResponsiveContainer>
            <PieChart>
            <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                labelLine={false}
            >
                {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
                iconType="circle" 
                iconSize={10} 
              className="attendance-donut-chart-legend"
            />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-[var(--aau-text)] font-bold text-2xl">
                {total}
            </text>
            <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-[var(--aau-muted)] text-sm">
                Total Sessions
            </text>
            </PieChart>
        </ResponsiveContainer>
    </div>
  );
};
