import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Bar } from 'react-chartjs-2';
import type { InstructorDashboardMetrics } from '../../../api';

interface EnrichedMetrics extends InstructorDashboardMetrics {
    course_performance: Array<{ course_id: string; course_name?: string; attendance_rate: number }>;
}

export default function ComparativeReports({ metrics }: { metrics: EnrichedMetrics | null }) {
    if (!metrics) return null;

    const chartData = {
        labels: metrics.course_performance.map(cp => cp.course_name || cp.course_id.substring(0, 8).toUpperCase()),
        datasets: [
            {
                label: 'Attendance Rate %',
                data: metrics.course_performance.map(cp => cp.attendance_rate),
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.9)'); // Indigo 500
                    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.8)'); // Purple 500
                    return gradient;
                },
                borderRadius: 8,
                borderSkipped: false,
                barThickness: 40,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleFont: { size: 14, family: 'Inter, sans-serif' },
                bodyFont: { size: 13, family: 'Inter, sans-serif' },
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: (context: any) => ` ${context.parsed.y}% Attendance`,
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                grid: { color: '#f8fafc', drawBorder: false },
                ticks: {
                    color: '#94a3b8',
                    font: { family: 'Inter, sans-serif', weight: 600 as const },
                    callback: (val: any) => `${val}%`
                }
            },
            x: {
                grid: { display: false, drawBorder: false },
                ticks: {
                    color: '#64748b',
                    font: { family: 'Inter, sans-serif', weight: 600 as const }
                }
            }
        }
    };

    return (
        <Card className="border-slate-50 shadow-md">
            <CardHeader>
                <CardTitle>Comparative Analytics</CardTitle>
                <CardDescription>Compare attendance performance across all your assigned courses.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full mt-4">
                    <Bar data={chartData} options={options as any} />
                </div>
            </CardContent>
        </Card>
    );
}
