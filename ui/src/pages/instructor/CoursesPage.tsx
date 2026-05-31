import { useState, useEffect } from 'react';
import { BookOpen, Users, Search, ChevronRight, GraduationCap } from 'lucide-react';
import { api } from '../../api';
import { CourseDetailView } from '../../components/instructor/CourseDetailView';
import { PageHeader } from '@/components/instructor/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Course {
  id: string;
  name: string;
  course_id: string;
  description: string;
  credit_hours: number;
  class_id: string;
}

interface CourseRow extends Course {
  studentCount: number;
  sectionLabel: string;
}

interface Assignment {
  id: string;
  instructor_id: string;
  class_id: string;
  course_id: string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseRow | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const assignments = await api.request<Assignment[]>('/instructor/assignments');
        const courseDetails = await Promise.all(
          assignments.map(async (a) => {
            const course = await api.request<Course>(`/course/${a.course_id}`);
            const [count, cls] = await Promise.all([
              api.studentCount(a.course_id, a.class_id).catch(() => 0),
              api.classDetails(a.class_id).catch(() => null),
            ]);
            return {
              ...course,
              studentCount: count,
              class_id: a.class_id,
              sectionLabel: cls ? `Year ${cls.year} · Sec ${cls.section}` : '—',
            } as CourseRow;
          })
        );
        setCourses(courseDetails);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.sectionLabel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full rounded-xl" />
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
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="My courses"
        description="All sections assigned to you. Open a roster to view students and attendance."
        icon={<BookOpen className="h-5 w-5" />}
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search course or section..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Course</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Section</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Credits</TableHead>
                <TableHead className="text-right">Roster</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.map((course) => (
                <TableRow
                  key={`${course.id}-${course.class_id}`}
                  className="cursor-pointer"
                  onClick={() => setSelectedCourse(course)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{course.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {course.course_id}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{course.sectionLabel}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {course.studentCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {course.credit_hours}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCourse(course);
                      }}
                    >
                      Open
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCourses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                    No courses match your search.
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
