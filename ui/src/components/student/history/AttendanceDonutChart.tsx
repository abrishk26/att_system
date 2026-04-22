import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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
      const { name, value, fill } = payload[0];
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-none shadow-xl border border-white/10 text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2" style={{ backgroundColor: fill }}></div>
            <p>{`${name}: ${value} (${percentage}%)`}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[300px] relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data.filter(d => d.value > 0)}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={100}
            paddingAngle={4}
            stroke="none"
            animationBegin={0}
            animationDuration={1500}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-4xl font-black text-slate-900 tracking-tighter">{total}</span>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sessions</span>
      </div>
    </div>
  );
};
