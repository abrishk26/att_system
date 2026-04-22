import React, { useState, useEffect, useMemo } from 'react';
import {
    ChevronLeft,
    Search,
    Users,
    Clock,
    BookOpen,
    Calendar,
    ArrowLeft,
    Filter,
    MoreHorizontal,
    Mail,
    IdCard,
    ArrowUpDown,
    Download
} from 'lucide-react';
import { api } from '../../api';
import type { StudentProfile, Class } from '../../api';

interface CourseDetailViewProps {
    courseId: string;
    courseName: string;
    courseCode: string;
    classId: string;
    creditHours: number;
    onBack: () => void;
}

const ITEMS_PER_PAGE = 8;

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
    courseId,
    courseName,
    courseCode,
    classId,
    creditHours,
    onBack
}) => {
    const [classDetail, setClassDetail] = useState<Class | null>(null);
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: keyof StudentProfile, direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [classData, studentsData] = await Promise.all([
                    api.classDetails(classId).catch(() => null),
                    api.instructorStudents(courseId, classId).catch(() => [])
                ]);
                setClassDetail(classData);
                setStudents(studentsData);
            } catch (error) {
                console.error("Failed to fetch course detail data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [courseId, classId]);

    const handleSort = (key: keyof StudentProfile) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedStudents = useMemo(() => {
        let sortableItems = [...students];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key] || '';
                const bValue = b[sortConfig.key] || '';
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [students, sortConfig]);

    const filteredStudents = useMemo(() => {
        return sortedStudents.filter(student =>
            `${student.first_name} ${student.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.nfc_id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sortedStudents, searchTerm]);

    const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl border border-slate-100 shadow-sm">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
                <p className="text-slate-500 font-medium">Fetching course roster...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-900 group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">{courseCode}</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Class {classDetail ? `20${classDetail.year}-${classDetail.section}` : 'N/A'}
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900">{courseName}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                        <Download size={16} />
                        Export
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95">
                        Send Message
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enrolled</p>
                        <p className="text-xl font-black text-slate-900">{students.length} Students</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Course Load</p>
                        <p className="text-xl font-black text-slate-900">{creditHours} Credits</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Section</p>
                        <p className="text-xl font-black text-slate-900">{classDetail ? `SEC 0${classDetail.section}` : 'N/A'}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Level</p>
                        <p className="text-xl font-black text-slate-900">Year {classDetail ? classDetail.year : 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* Modern Data Table Section */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                {/* Table Toolbar */}
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Filter students by name or ID..."
                            className="w-full bg-slate-50 border-none pl-11 pr-4 py-3 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="p-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-all border border-slate-100">
                            <Filter size={18} />
                        </button>
                        <div className="h-6 w-px bg-slate-100 mx-1"></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                            {filteredStudents.length} Students found
                        </span>
                    </div>
                </div>

                {/* The Table */}
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('first_name')}>
                                    <div className="flex items-center gap-2">
                                        Student Info
                                        <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('username')}>
                                    <div className="flex items-center gap-2">
                                        University ID
                                        <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => handleSort('attendance_percentage')}>
                                    <div className="flex items-center gap-2">
                                        Attendance
                                        <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th className="px-6 py-4">NFC Access Token</th>
                                <th className="px-6 py-4">Current Status</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedStudents.map((student) => (
                                <tr key={student.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-extrabold shadow-sm border border-white overflow-hidden">
                                                    {student.img_url ? (
                                                        <img src={student.img_url} alt={student.first_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        student.first_name.charAt(0)
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white bg-emerald-500"></div>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 leading-tight">
                                                    {student.first_name} {student.last_name}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Mail size={10} className="text-slate-400" />
                                                    <span className="text-[10px] text-slate-400 font-medium lowercase tracking-tight">
                                                        {student.username}@edu.et
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600 font-medium">
                                            <IdCard size={14} className="text-slate-400" />
                                            {student.username.toUpperCase()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                                <span>Stats</span>
                                                <span className={student.attendance_percentage! >= 75 ? 'text-emerald-600' : 'text-amber-600'}>
                                                    {student.attendance_percentage?.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${student.attendance_percentage! >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${student.attendance_percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <code className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-wider">
                                            {student.nfc_id}
                                        </code>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            <span className="w-1 h-1 rounded-full bg-emerald-600 animate-pulse"></span>
                                            Active Enrollee
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all">
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {paginatedStudents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 px-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                                <Search size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">No results found</h3>
                            <p className="text-slate-500 text-sm max-w-xs text-center mt-1">
                                We couldn't find any students matching "{searchTerm}". Try checking for typos or use different keywords.
                            </p>
                        </div>
                    )}
                </div>

                {/* Table Pagination Container */}
                <div className="p-6 border-t border-slate-50 bg-slate-50/5 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} of {filteredStudents.length} entries
                    </p>

                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent hover:bg-white hover:shadow-sm transition-all font-bold"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-9 h-9 rounded-xl font-bold transition-all text-sm ${currentPage === page ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}
                                >
                                    {page}
                                </button>
                            ))}
                            {totalPages > 5 && <span className="text-slate-300 px-1">...</span>}
                        </div>

                        <button
                            disabled={currentPage === totalPages || totalPages === 0}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent hover:bg-white hover:shadow-sm transition-all font-bold"
                        >
                            <ChevronLeft size={18} className="rotate-180" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
