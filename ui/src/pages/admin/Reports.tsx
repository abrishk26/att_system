import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type ReportDocument, type UniversityIntelligence } from '@/api';
import {
  exportInstitutionalPDF,
  exportToExcelFriendlyCsv,
  openPrintableReportHtml,
} from '@/lib/exportUtils';
import { REPORT_CATALOG, findReport } from '@/lib/admin/reportCatalog';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uniqueBatchYears, uniqueSections } from '@/lib/admin/batchAnalytics';
import { toIsoEnd, toIsoStart } from '@/lib/admin/dates';
import {
  reportFilterConfig,
  validateReportDateRange,
} from '@/lib/admin/reportFilters';

type ExportFormat = 'pdf' | 'excel_csv' | 'html_print' | 'json';

export default function Reports() {
  const [categoryId, setCategoryId] = useState(REPORT_CATALOG[0].id);
  const [reportType, setReportType] = useState(REPORT_CATALOG[0].reports[0].id);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ReportDocument | null>(null);
  const [recent, setRecent] = useState<{ name: string; at: string; type: string }[]>([]);
  const [intelSnapshot, setIntelSnapshot] = useState<UniversityIntelligence | null>(null);
  const [classYear, setClassYear] = useState<string>('all');
  const [section, setSection] = useState<string>('all');

  const category = REPORT_CATALOG.find((c) => c.id === categoryId) ?? REPORT_CATALOG[0];
  const meta = findReport(reportType);

  const filters = reportFilterConfig(reportType);
  const showCohortFilters = filters.supportsCohort;

  useEffect(() => {
    api.universityAnalytics().then(setIntelSnapshot).catch(() => {});
  }, []);

  const batchYears = useMemo(
    () => (intelSnapshot ? uniqueBatchYears(intelSnapshot) : []),
    [intelSnapshot]
  );

  const sectionOptions = useMemo(() => {
    if (!intelSnapshot || classYear === 'all') return [];
    return uniqueSections(intelSnapshot, Number(classYear));
  }, [intelSnapshot, classYear]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recent_reports');
      if (saved) setRecent(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!category.reports.some((r) => r.id === reportType)) {
      setReportType(category.reports[0].id);
    }
  }, [categoryId, category.reports, reportType]);

  const saveRecent = (entry: { name: string; at: string; type: string }) => {
    const next = [entry, ...recent].slice(0, 10);
    setRecent(next);
    localStorage.setItem('recent_reports', JSON.stringify(next));
  };

  const generatePreview = async () => {
    setError(null);
    const dateErr = validateReportDateRange(from, to);
    if (dateErr) {
      setError(dateErr);
      return;
    }
    setBusy(true);
    setPreviewDoc(null);
    try {
      const doc = await api.buildReport({
        report_type: reportType,
        from: from.trim() ? toIsoStart(from) : undefined,
        to: to.trim() ? toIsoEnd(to) : undefined,
        include_charts: false,
        class_year:
          showCohortFilters && classYear !== 'all' ? Number(classYear) : undefined,
        section: showCohortFilters && section !== 'all' ? Number(section) : undefined,
      });
      setPreviewDoc(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to build report');
    } finally {
      setBusy(false);
    }
  };

  const triggerExport = () => {
    if (!previewDoc) return;
    const name = `${reportType}_${Date.now()}`;
    try {
      if (exportFormat === 'pdf') exportInstitutionalPDF(previewDoc, name);
      else if (exportFormat === 'html_print') openPrintableReportHtml(previewDoc.title, previewDoc);
      else if (exportFormat === 'json') {
        const blob = new Blob([JSON.stringify(previewDoc, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const flatRows: Record<string, string>[] = [];
        previewDoc.kpis.forEach((kpi) => {
          kpi.items.forEach((item) => {
            flatRows.push({ Section: kpi.title, Metric: item[0] ?? '', Value: item[1] ?? '' });
          });
        });
        previewDoc.tables.forEach((table) => {
          table.rows.forEach((row) => {
            const rowObj: Record<string, string> = { Section: table.title };
            table.columns.forEach((col, idx) => {
              rowObj[col] = row[idx] ?? '';
            });
            flatRows.push(rowObj);
          });
        });
        exportToExcelFriendlyCsv(flatRows, name);
      }
      saveRecent({ name: meta?.title ?? reportType, at: new Date().toISOString(), type: reportType });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <PageHeader
        title="Reports"
        description="Export PDF or spreadsheet packs generated from live attendance data. Pick a report, set the period, preview, then download."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/reports/student-attendance">Student roster export</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/reports/course-attendance">Course roster export</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report library</CardTitle>
              <CardDescription>Select a category, then a report type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {REPORT_CATALOG.map((c) => (
                  <Button
                    key={c.id}
                    type="button"
                    size="sm"
                    variant={categoryId === c.id ? 'default' : 'outline'}
                    onClick={() => setCategoryId(c.id)}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{category.description}</p>
              <Separator />
              <ul className="space-y-2">
                {category.reports.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setReportType(r.id)}
                      className={cn(
                        'w-full rounded-lg border px-3 py-3 text-left text-sm transition-colors',
                        reportType === r.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <p className="font-medium">{r.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{r.audience}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {meta && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{meta.title}</CardTitle>
                <CardDescription>{meta.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  This export contains
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {meta.includes.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generate</CardTitle>
              <CardDescription>
                Leave dates empty to include all recorded sessions. When set, the range is
                inclusive (same start and end date includes that full day).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="from">From (optional)</Label>
                  <Input
                    id="from"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to">To (optional)</Label>
                  <Input
                    id="to"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              </div>
              {showCohortFilters && (
                <div className="grid gap-4 sm:grid-cols-2 rounded-lg border border-border bg-muted/20 p-4">
                  <p className="sm:col-span-2 text-xs text-muted-foreground">
                    Optional cohort scope: limit metrics to a batch year and/or section. Leave as
                    “All” for institution-wide totals, or pick a cohort for section-specific
                    instructor and course data.
                  </p>
                  <div className="space-y-2">
                    <Label>Batch year</Label>
                    <Select
                      value={classYear}
                      onValueChange={(v) => {
                        setClassYear(v);
                        setSection('all');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All years</SelectItem>
                        {batchYears.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            Year {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Select
                      value={section}
                      onValueChange={setSection}
                      disabled={classYear === 'all'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All sections" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sections</SelectItem>
                        {sectionOptions.map((s) => (
                          <SelectItem key={s} value={String(s)}>
                            Section {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel_csv">Spreadsheet (CSV)</SelectItem>
                    <SelectItem value="html_print">Print layout (HTML)</SelectItem>
                    <SelectItem value="json">JSON (raw data)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={generatePreview} disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Build preview
                </Button>
                <Button variant="secondary" onClick={triggerExport} disabled={!previewDoc || busy}>
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>
                {previewDoc
                  ? `${previewDoc.tables.length} table(s), ${previewDoc.kpis.length} KPI block(s)`
                  : 'Build a preview to verify contents before download'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!previewDoc ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No preview yet.
                </p>
              ) : (
                <ScrollArea className="h-[min(480px,55vh)] pr-3">
                  <div className="space-y-4 text-sm">
                    <div>
                      <h3 className="font-semibold">{previewDoc.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(previewDoc.generated_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="leading-relaxed">{previewDoc.executive_summary}</p>
                    {previewDoc.kpis.map((block, i) => (
                      <div key={i}>
                        <p className="mb-2 font-medium">{block.title}</p>
                        <dl className="grid gap-1 rounded-md border border-border p-2">
                          {block.items.map((item, j) => (
                            <div key={j} className="flex justify-between gap-2 text-xs">
                              <dt className="text-muted-foreground">{item[0]}</dt>
                              <dd className="font-medium tabular-nums">{item[1]}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                    {previewDoc.tables.map((table, i) => (
                      <div key={i}>
                        <p className="mb-2 font-medium">
                          {table.title}{' '}
                          <span className="text-muted-foreground">({table.rows.length} rows)</span>
                        </p>
                        <div className="overflow-x-auto rounded-md border border-border">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                {table.columns.map((c) => (
                                  <th key={c} className="px-2 py-2 text-left font-medium">
                                    {c}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows.slice(0, 20).map((row, ri) => (
                                <tr key={ri} className="border-b border-border/60">
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="px-2 py-1.5">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {recent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent downloads</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {recent.map((r, i) => (
                    <li key={i} className="flex justify-between gap-2 border-b border-border py-2">
                      <span>{r.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(r.at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
