import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { FileText, Filter, FileSpreadsheet, LayoutDashboard, Users, AlertTriangle, CalendarDays } from 'lucide-react';
import { api } from '../../../api';

interface ReportGeneratorProps {
    assignments: any[];
    metrics: any;
    onExportPDF: (filename: string, headers: any[], data: any[]) => void;
    onExportCSV: (data: any[], filename: string) => void;
}

export default function ReportGeneratorDialog({ assignments, metrics, onExportPDF, onExportCSV }: ReportGeneratorProps) {
    const [open, setOpen] = useState(false);
    const [reportType, setReportType] = useState('overview');
    const [targetAssignment, setTargetAssignment] = useState('all');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async (format: 'pdf' | 'csv') => {
        setIsGenerating(true);
        try {
            let data: any[] = [];
            let headers: any[] = [];
            let filename = `Report_${reportType}_${new Date().getTime()}`;

            if (reportType === 'overview') {
                headers = [{ header: 'Course', dataKey: 'course' }, { header: 'Attendance %', dataKey: 'attendance' }];
                data = metrics?.course_performance.map((cp: any) => ({
                    course: cp.course_name,
                    attendance: `${cp.attendance_rate.toFixed(1)}%`
                })) || [];
            } 
            else if (reportType === 'students' || reportType === 'at_risk') {
                headers = [
                    { header: 'Student ID', dataKey: 'id' },
                    { header: 'Name', dataKey: 'name' },
                    { header: 'Attendance %', dataKey: 'attendance' }
                ];
                
                let targetCourses = targetAssignment === 'all' ? assignments : assignments.filter(a => a.id === targetAssignment);
                
                for (const course of targetCourses) {
                    try {
                        const students = await api.instructorStudents(course.course_id, course.class_id);
                        students.forEach(s => {
                            let att = s.attendance_percentage ?? 0;
                            if (reportType === 'at_risk' && att >= 75) return; // Skip if not at risk
                            
                            data.push({
                                id: s.username || s.nfc_id,
                                name: `${s.first_name} ${s.last_name || ''}`.trim(),
                                attendance: `${att.toFixed(1)}%`
                            });
                        });
                    } catch (e) {
                        console.error("Failed to fetch students for course", e);
                    }
                }
            }
            else if (reportType === 'sessions') {
                headers = [
                    { header: 'Session ID', dataKey: 'id' },
                    { header: 'Course', dataKey: 'course' },
                    { header: 'Status', dataKey: 'status' }
                ];
                const allSessions = await api.instructorSessions();
                let filtered = targetAssignment === 'all' 
                    ? allSessions 
                    : allSessions.filter(s => {
                        const a = assignments.find(a => a.id === targetAssignment);
                        return a && s.course_id === a.course_id && s.class_id === a.class_id;
                    });
                
                data = filtered.map(s => ({
                    id: s.id.substring(0, 8).toUpperCase(),
                    course: assignments.find(a => a.course_id === s.course_id)?.course_name || 'Unknown',
                    status: s.status
                }));
            }

            if (data.length === 0) {
                alert("No data available for the selected filters.");
                return;
            }

            if (format === 'pdf') {
                onExportPDF(filename, headers, data);
            } else {
                onExportCSV(data, filename);
            }
            setOpen(false);
        } catch (error) {
            console.error("Error generating report", error);
            alert("Failed to generate report.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-md transition-all">
                    <Filter size={16} className="mr-2" />
                    Custom Report
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] rounded-3xl border-slate-100 p-0 overflow-hidden">
                <div className="bg-slate-50 p-6 border-b border-slate-100">
                    <DialogTitle className="text-xl font-black text-slate-900">Report Generator</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500 mt-1">
                        Select your data points and format to download a tailored analytics report.
                    </DialogDescription>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Report Subject</label>
                        <Select value={reportType} onValueChange={setReportType}>
                            <SelectTrigger className="w-full bg-white border border-slate-200 rounded-xl h-12 px-4 shadow-sm">
                                <SelectValue placeholder="Select Report Type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100">
                                <SelectItem value="overview" className="rounded-lg cursor-pointer my-1">
                                    <div className="flex items-center gap-2">
                                        <LayoutDashboard size={16} className="text-indigo-500" />
                                        <span className="font-medium">Dashboard Overview</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="students" className="rounded-lg cursor-pointer my-1">
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className="text-emerald-500" />
                                        <span className="font-medium">Student Roster</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="at_risk" className="rounded-lg cursor-pointer my-1">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={16} className="text-rose-500" />
                                        <span className="font-medium">At-Risk Students (&lt;75%)</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="sessions" className="rounded-lg cursor-pointer my-1">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays size={16} className="text-amber-500" />
                                        <span className="font-medium">Session History</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className={`space-y-3 transition-opacity ${reportType === 'overview' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Data Source</label>
                        <Select value={targetAssignment} onValueChange={setTargetAssignment}>
                            <SelectTrigger className="w-full bg-white border border-slate-200 rounded-xl h-12 px-4 shadow-sm">
                                <SelectValue placeholder="Select Target Course" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100">
                                <SelectItem value="all" className="rounded-lg cursor-pointer my-1">
                                    <span className="font-bold">All Courses</span>
                                </SelectItem>
                                {assignments.map(a => (
                                    <SelectItem key={a.id} value={a.id} className="rounded-lg cursor-pointer my-1">
                                        <span className="font-medium">{a.course_name} <span className="text-slate-400 text-xs ml-1">(Sec {a.class_name})</span></span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => handleGenerate('csv')} 
                        disabled={isGenerating}
                        className="w-full sm:w-1/2 border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-white hover:border-indigo-200 h-12 rounded-xl transition-all"
                    >
                        <FileSpreadsheet size={18} className="mr-2" />
                        Export CSV
                    </Button>
                    <Button 
                        onClick={() => handleGenerate('pdf')} 
                        disabled={isGenerating}
                        className="w-full sm:w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl shadow-md shadow-indigo-600/20 transition-all"
                    >
                        {isGenerating ? 'Processing...' : (
                            <>
                                <FileText size={18} className="mr-2" />
                                Export PDF
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
