import { useState, useEffect } from 'react';
import { BookOpen, Users, Clock, ArrowRight, Search, Loader2 } from 'lucide-react';
import { api } from '../../api';
import { CourseDetailView } from '../../components/instructor/CourseDetailView';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";

interface Course {
    id: string;
    name: string;
    course_id: string;
    description: string;
    credit_hours: number;
    class_id: string;
}

interface Assignment {
    id: string;
    instructor_id: string;
    class_id: string;
    course_id: string;
}

export default function CoursesPage() {
    const [courses, setCourses] = useState<(Course & { studentCount: number })[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourse, setSelectedCourse] = useState<(Course & { studentCount: number }) | null>(null);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                // Fetch instructor assignments
                const assignments = await api.request<Assignment[]>('/instructor/assignments');

                const courseDetails = await Promise.all(
                    assignments.map(async (a) => {
                        const course = await api.request<Course>(`/course/${a.course_id}`);
                        const count = await api.studentCount(a.course_id, a.class_id).catch(() => 0);
                        return { ...course, studentCount: count, class_id: a.class_id };
                    })
                );

                setCourses(courseDetails);
            } catch (error) {
                console.error("Failed to fetch courses:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

    const filteredCourses = courses.filter((course) =>
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.course_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <Loader2 className="animate-spin text-primary" size={32} />
                <span className="text-slate-500 font-medium">Fetching your courses...</span>
            </div>
        );
    }

    if (selectedCourse) {
        return (
            <CourseDetailView
                courseId={selectedCourse.id}
                courseName={selectedCourse.name}
                courseCode={selectedCourse.course_id}
                classId={selectedCourse.class_id}
                creditHours={selectedCourse.credit_hours}
                onBack={() => setSelectedCourse(null)}
            />
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Assigned Courses</h1>
                    <p className="text-slate-500 font-medium mt-1">Detailed list of your current curriculum and class rosters</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or code..."
                        className="bg-white border border-slate-200 pl-11 pr-4 h-11 rounded-xl text-sm focus:ring-2 focus:ring-primary/10 outline-none w-full md:w-80 shadow-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="border-slate-50 shadow-md overflow-hidden rounded-3xl">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-16 px-6 font-bold text-slate-500 text-center">Icon</TableHead>
                                <TableHead className="font-bold text-slate-500">Course Identification</TableHead>
                                <TableHead className="font-bold text-slate-500">Enrolled Students</TableHead>
                                <TableHead className="font-bold text-slate-500">Credit Load</TableHead>
                                <TableHead className="text-right px-6 font-bold text-slate-500">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCourses.map((course) => (
                                <TableRow key={course.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <TableCell className="px-6">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors mx-auto">
                                            <BookOpen size={20} />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 leading-tight">{course.name}</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-0.5">{course.course_id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                                <Users size={14} className="text-emerald-600" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">{course.studentCount} students</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-slate-400" />
                                            <span className="text-sm font-medium text-slate-600">{course.credit_hours} Cr.Hrs</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <Button 
                                            onClick={() => setSelectedCourse(course)}
                                            className="bg-slate-900 hover:bg-indigo-600 text-white font-bold h-9 rounded-lg px-4 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                                        >
                                            View Roster
                                            <ArrowRight size={14} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredCourses.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <BookOpen size={48} className="text-slate-200" />
                                            <p className="font-bold text-slate-400">No courses match your search.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
