import { useState, useEffect } from 'react';
import { api } from '../../../api';
import type { Session, Assignment } from '../../../api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Line } from 'react-chartjs-2';

interface EnrichedAssignment extends Assignment {
    course_name?: string;
    class_name?: string;
}

export default function SessionReports({ assignments }: { assignments: EnrichedAssignment[] }) {
    const [selectedAssignment, setSelectedAssignment] = useState<EnrichedAssignment | null>(assignments[0] || null);
    const [sessions, setSessions] = useState<(Session & { attendance_rate?: number })[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (assignments.length > 0 && !selectedAssignment) {
            setSelectedAssignment(assignments[0]);
        }
    }, [assignments]);

    useEffect(() => {
        if (selectedAssignment) {
            loadSessions();
        }
    }, [selectedAssignment]);

    const loadSessions = async () => {
        if (!selectedAssignment) return;
        setIsLoading(true);
        try {
            const allSessions = await api.instructorSessions();
            const courseSessions = allSessions.filter(s => 
                s.course_id === selectedAssignment.course_id && 
                s.class_id === selectedAssignment.class_id &&
                (s.status === 'completed' || s.status === 'finished')
            );
            
            const enhancedSessions = await Promise.all(
                courseSessions.map(async (s) => {
                    try {
                        const records = await api.sessionRecords(s.id);
                        const present = records.filter(r => r.status === 'present').length;
                        const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
                        return { ...s, attendance_rate: rate };
                    } catch {
                        return { ...s, attendance_rate: 0 };
                    }
                })
            );

            setSessions(enhancedSessions);
        } catch (error) {
            console.error("Failed to load sessions", error);
        } finally {
            setIsLoading(false);
        }
    };

    const chartData = {
        labels: sessions.map((_, idx) => `Session ${idx + 1}`),
        datasets: [
            {
                label: 'Attendance Rate',
                data: sessions.map(s => s.attendance_rate || 0),
                borderColor: '#10b981', // Emerald 500
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                pointBackgroundColor: sessions.map(s => (s.attendance_rate || 0) < 75 ? '#f43f5e' : '#10b981'),
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#10b981',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 7,
            }
        ]
    };

    const chartOptions = {
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
                min: 0,
                max: 100,
                grid: { color: '#f8fafc' },
                ticks: {
                    color: '#94a3b8',
                    font: { family: 'Inter, sans-serif', weight: 600 as const },
                    callback: (val: any) => `${val}%`
                }
            },
            x: {
                grid: { display: false },
                ticks: {
                    color: '#64748b',
                    font: { family: 'Inter, sans-serif', weight: 600 as const }
                }
            }
        }
    };

    return (
        <Card className="border-slate-50 shadow-md">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <CardTitle>Session Attendance Analytics</CardTitle>
                    <CardDescription>Review attendance trends across individual class sessions.</CardDescription>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select 
                        className="w-full md:w-72 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                        value={selectedAssignment?.id || ''}
                        onChange={(e) => {
                            const found = assignments.find(a => a.id === e.target.value);
                            if (found) setSelectedAssignment(found);
                        }}
                    >
                        {assignments.map(a => (
                            <option key={a.id} value={a.id}>
                                {a.course_name || a.course_id.substring(0, 8)} (Sec {a.class_name || a.class_id.substring(0, 8)})
                            </option>
                        ))}
                    </select>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-[300px] w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        No completed sessions found for this course.
                    </div>
                ) : (
                    <>
                        <div className="h-[300px] w-full">
                            <Line data={chartData} options={chartOptions as any} />
                        </div>

                        <div className="rounded-xl border border-slate-100 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-16 font-bold text-slate-500">#</TableHead>
                                        <TableHead className="font-bold text-slate-500">Session ID</TableHead>
                                        <TableHead className="font-bold text-slate-500">Status</TableHead>
                                        <TableHead className="text-right font-bold text-slate-500">Attendance Rate</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.map((session, idx) => {
                                        const rate = session.attendance_rate || 0;
                                        const isLow = rate < 75;
                                        return (
                                            <TableRow key={session.id} className={isLow ? 'bg-amber-50/30' : ''}>
                                                <TableCell className="font-black text-slate-400">{idx + 1}</TableCell>
                                                <TableCell className="font-medium text-slate-900 font-mono text-xs uppercase">
                                                    {session.id.substring(0, 8)}
                                                </TableCell>
                                                <TableCell>
                                                    {isLow ? (
                                                        <Badge variant="destructive" className="bg-amber-500 text-white hover:bg-amber-600">Low Attendance</Badge>
                                                    ) : (
                                                        <Badge variant="default" className="bg-slate-100 text-slate-600 hover:bg-slate-200">Normal</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`font-bold ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                                                        {rate}%
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
