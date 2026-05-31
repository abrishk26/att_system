import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Users, Download, Mail } from 'lucide-react';
import { api } from '../../api';
import type { StudentProfile, Class } from '../../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { exportToCSV } from '@/lib/exportUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface CourseDetailViewProps {
  courseId: string;
  courseName: string;
  courseCode: string;
  classId: string;
  creditHours: number;
  onBack: () => void;
}

const ITEMS_PER_PAGE = 10;

export function CourseDetailView({
  courseId,
  courseName,
  courseCode,
  classId,
  creditHours,
  onBack,
}: CourseDetailViewProps) {
  const [classDetail, setClassDetail] = useState<Class | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [classData, studentsData] = await Promise.all([
          api.classDetails(classId).catch(() => null),
          api.instructorStudents(courseId, classId).catch(() => []),
        ]);
        setClassDetail(classData);
        setStudents(studentsData);
      } catch (error) {
        console.error('Failed to fetch course detail data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId, classId]);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return students.filter(
      (s) =>
        `${s.first_name} ${s.last_name || ''}`.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        s.nfc_id.toLowerCase().includes(q)
    );
  }, [students, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const sectionLabel = classDetail
    ? `Year ${classDetail.year} · Section ${classDetail.section}`
    : 'Section';

  const handleExport = () => {
    exportToCSV(
      students.map((s) => ({
        Name: `${s.first_name} ${s.last_name || ''}`.trim(),
        Username: s.username,
        'NFC ID': s.nfc_id,
        'Attendance %': s.attendance_percentage != null ? `${s.attendance_percentage.toFixed(1)}%` : '—',
      })),
      `roster_${courseCode}_${sectionLabel.replace(/\s/g, '_')}`
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" onClick={onBack} aria-label="Back to courses">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{courseCode}</Badge>
              <Badge variant="secondary">{sectionLabel}</Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{courseName}</h1>
            <p className="text-sm text-muted-foreground">Class roster · {creditHours} credit hours</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enrolled</CardDescription>
            <CardTitle className="text-2xl">{students.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Active in this section</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>At risk (&lt;75%)</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {students.filter((s) => (s.attendance_percentage ?? 100) < 75).length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">May need follow-up</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Strong (&ge;85%)</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">
              {students.filter((s) => (s.attendance_percentage ?? 0) >= 85).length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">On track</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Students
            </CardTitle>
            <CardDescription>{filteredStudents.length} shown</CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, ID, NFC..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>University ID</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>NFC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStudents.map((student) => {
                const pct = student.attendance_percentage ?? 0;
                return (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {student.img_url ? (
                            <AvatarImage src={student.img_url} alt={student.first_name} />
                          ) : null}
                          <AvatarFallback className="text-xs font-medium">
                            {student.first_name.charAt(0)}
                            {(student.last_name || '').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium leading-none">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {student.username}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{student.username}</TableCell>
                    <TableCell className="w-[140px]">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className={pct >= 75 ? 'text-emerald-600' : 'text-amber-600'}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-0.5 text-xs">{student.nfc_id}</code>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!paginatedStudents.length && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    No students match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="border-t border-border p-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage((p) => Math.max(1, p - 1));
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(0, 5)
                    .map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={page === currentPage}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page);
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                      }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
