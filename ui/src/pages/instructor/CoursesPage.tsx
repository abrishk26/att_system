import { useState, useEffect } from 'react';
import { BookOpen, Users, Clock, ArrowRight, Search } from 'lucide-react';
import { api } from '../../api';
import { CourseDetailView } from '../../components/instructor/CourseDetailView';

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
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Courses</h1>
                    <p className="text-slate-500 mt-1">Manage your assigned courses and student rosters</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search courses..."
                            className="bg-white border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-primary/10 outline-none w-64 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {filteredCourses.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-100">
                        <BookOpen size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No courses found</h3>
                    <p className="text-slate-500 mt-1">You don't have any courses assigned to your profile yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => (
                        <div key={course.id} className="bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Search size={20} className="text-primary/20" />
                            </div>

                            <div className="flex items-start justify-between mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <BookOpen size={24} />
                                </div>
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    {course.course_id}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-primary transition-colors">
                                {course.name}
                            </h3>
                            <p className="text-slate-500 text-sm line-clamp-2 mb-6 h-10">
                                {course.description || "No description available for this course. Please contact the department for more details."}
                            </p>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Users size={16} className="text-slate-400" />
                                    <span className="text-sm font-medium">{course.studentCount} Students</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Clock size={16} className="text-slate-400" />
                                    <span className="text-sm font-medium">{course.credit_hours} Credits</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedCourse(course)}
                                className="w-full mt-6 py-3.5 bg-slate-900 text-white font-bold rounded-2xl transition-all hover:bg-primary shadow-lg shadow-slate-900/10 hover:shadow-primary/20 flex items-center justify-center gap-2 group/btn active:scale-95"
                            >
                                View Detailed Roster
                                <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
