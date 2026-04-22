import { useState, useEffect } from 'react';
import { Clock, MapPin, Grid, List } from 'lucide-react';
import { api } from '../../api';

interface ScheduleItem {
    id: string;
    name: string;
    course_id: string;
    class_name: string;
    start_time: string;
    end_time: string;
    day: string;
    room: string;
}

export default function SchedulePage() {
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                // In a real app, you'd fetch the instructor's specific schedule
                // Merging data from assignments and sessions for now
                const assignments: any[] = await api.request('/instructor/assignments');

                const scheduleData = await Promise.all(
                    assignments.map(async (a) => {
                        const [course, classDetail] = await Promise.all([
                            api.request<any>(`/course/${a.course_id}`),
                            api.request<any>(`/class/${a.class_id}`)
                        ]);
                        return {
                            id: a.id,
                            name: course.name,
                            course_id: course.course_id,
                            class_name: classDetail.class_name,
                            start_time: "TBD",
                            end_time: "TBD",
                            day: "Monday", // Still placeholder as it's not in DB
                            room: "TBD"
                        };
                    })
                );

                setSchedule(scheduleData);
            } catch (error) {
                console.error("Failed to fetch schedule:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
    }, []);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Class Schedule</h1>
                    <p className="text-slate-500 mt-1">Weekly overview of your teaching sessions and room assignments</p>
                </div>

                <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Grid size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <List size={20} />
                    </button>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {days.map(day => (
                        <div key={day} className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm overflow-hidden relative group">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-slate-900">{day}</h3>
                                <span className="text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-full uppercase tracking-widest">
                                    {schedule.filter(item => item.day === day).length} Classes
                                </span>
                            </div>

                            <div className="space-y-4">
                                {schedule.filter(item => item.day === day).length === 0 ? (
                                    <p className="text-slate-400 text-sm italic py-4">No classes scheduled for this day.</p>
                                ) : (
                                    schedule.filter(item => item.day === day).map(item => (
                                        <div key={item.id} className="p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-primary/20 hover:bg-white transition-all group/item">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="text-xs font-bold text-primary uppercase tracking-tighter mb-1">{item.course_id}</p>
                                                    <h4 className="font-bold text-slate-900 line-clamp-1">{item.name}</h4>
                                                </div>
                                            </div>

                                            <div className="space-y-2 mt-4">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Clock size={14} />
                                                    <span className="text-xs font-medium">{item.start_time} - {item.end_time}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <MapPin size={14} />
                                                    <span className="text-xs font-medium">{item.room} ({item.class_name})</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50">
                                <th className="px-8 py-5">Day</th>
                                <th className="px-8 py-5">Time</th>
                                <th className="px-8 py-5">Course</th>
                                <th className="px-8 py-5">Room / Class</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {schedule.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6 font-bold text-slate-900">{item.day}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Clock size={16} className="text-slate-400" />
                                            <span className="text-sm font-medium">{item.start_time} - {item.end_time}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{item.name}</p>
                                            <p className="text-xs text-slate-400">{item.course_id}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <MapPin size={16} className="text-slate-400" />
                                            <span className="text-sm font-medium">{item.room} ({item.class_name})</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
