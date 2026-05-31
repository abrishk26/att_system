import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Menu,
  Moon,
  Shield,
  Sun,
  X,
} from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CAPABILITIES,
  NAV_LINKS,
  PORTALS,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
  ROLE_INSIGHTS,
  TRUST_ITEMS,
  WORKFLOW,
} from '@/lib/landing/content';

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useDarkMode();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground transition-colors duration-300">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Shield size={18} />
            </div>
            <div>
              <span className="block text-base font-bold leading-none tracking-tight">
                {PRODUCT_NAME}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {PRODUCT_TAGLINE}
              </span>
            </div>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollTo(link.id)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => setIsDark(!isDark)}
              aria-label={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button className="hidden sm:inline-flex" onClick={() => scrollTo('portals')}>
              Sign in
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label="Menu"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-border px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => {
                    scrollTo(link.id);
                    setMobileNavOpen(false);
                  }}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted"
                >
                  {link.label}
                </button>
              ))}
              <Button className="mt-2 w-full" onClick={() => scrollTo('portals')}>
                Sign in
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-16 pt-16 sm:px-6 sm:pt-20 lg:pb-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-indigo-500/15 blur-3xl dark:bg-indigo-600/10" />
          <div className="absolute -bottom-32 -right-32 h-[380px] w-[380px] rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-600/10" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="animate-fade-in-up text-center lg:text-left">
            <Badge variant="secondary" className="mb-6 gap-2 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              University attendance, one platform
            </Badge>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Know who attended.{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-emerald-400">
                Act before patterns become problems.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0">
              {PRODUCT_NAME} connects students, instructors, and department leadership around
              real session data — NFC-linked rosters, permission requests, analytics, and
              exportable reports built from your institution&apos;s own records.
            </p>

            <ul className="mx-auto mt-8 flex max-w-lg flex-wrap justify-center gap-x-5 gap-y-2 text-sm lg:mx-0 lg:justify-start">
              {TRUST_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Button size="lg" className="gap-2" onClick={() => scrollTo('portals')}>
                Choose your portal
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollTo('how-it-works')}>
                See how it works
              </Button>
            </div>
          </div>

          {/* Product snapshot — illustrative, no fake metrics */}
          <div className="animate-fade-in-up grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Card className="border-indigo-200/60 shadow-md dark:border-indigo-900/40 sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                  Department head · Analytics
                </CardDescription>
                <CardTitle className="text-base">University intelligence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Attendance trends, session heatmaps, at-risk learner tables, batch year &amp; section breakdowns, NFC tap audit.</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Date range filters', 'Course roll-ups', 'Report center PDF'].map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px] font-normal">
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                  Instructor · Attendance
                </CardDescription>
                <CardTitle className="text-base">Live session roster</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Present · Late · Absent · Excused — per student, per session, with permission review alongside.
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                  Student · Home
                </CardDescription>
                <CardTitle className="text-base">Your standing</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Overall rate, course list, recent sessions chart, history, and permission status with notifications.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 border-y border-border bg-muted/40 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Process</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              How attendance flows through the system
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Everything starts with a class session. From there, marks, permissions, and
              analytics stay connected to the same course and cohort context.
            </p>
          </div>

          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map((item) => (
              <li key={item.step}>
                <Card className="h-full border-border/80 bg-card">
                  <CardHeader>
                    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {item.step}
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Portals ────────────────────────────────────────────── */}
      <section id="portals" className="scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Access</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Three portals, one source of truth
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Sign in with your institutional account. Each role sees the screens and data
              relevant to that responsibility — no separate products to learn.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {PORTALS.map((portal) => (
              <button
                key={portal.id}
                type="button"
                onClick={() => navigate(portal.path)}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div
                  className={`mb-5 h-1 w-12 rounded-full bg-gradient-to-r ${portal.accent} opacity-80 group-hover:w-16 transition-all`}
                />
                <div className="mb-4 flex items-start justify-between gap-3">
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                    {portal.subtitle}
                  </Badge>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <portal.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">{portal.title}</h3>
                </div>
                <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                  {portal.description}
                </p>
                <ul className="mt-auto space-y-2 border-t border-border pt-4">
                  {portal.highlights.map((h) => (
                    <li key={h} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Sign in <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities ───────────────────────────────────────── */}
      <section id="capabilities" className="scroll-mt-20 border-t border-border bg-muted/30 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Built in</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              What the platform actually does
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              These are real modules in the application today — session rosters, analytics,
              exports, and audit trails — not a marketing wish list.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((cap) => (
              <Card key={cap.title} className="h-full bg-card/80">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <cap.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <CardTitle className="text-base">{cap.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{cap.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── By role ──────────────────────────────────────────────── */}
      <section id="insights" className="scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Guidance</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Find answers for your role
            </h2>
            <p className="mt-4 text-muted-foreground">
              Common questions and where to go in the app — so visitors know what to expect after sign-in.
            </p>
          </div>

          <Tabs defaultValue="student" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-3">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="instructor">Instructor</TabsTrigger>
              <TabsTrigger value="admin">Department head</TabsTrigger>
            </TabsList>
            {ROLE_INSIGHTS.map((block) => (
              <TabsContent key={block.id} value={block.id} className="space-y-4">
                <p className="text-sm font-medium text-muted-foreground">{block.label}</p>
                {block.questions.map((q, i) => (
                  <Card key={q}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold">{q}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {block.answers[i]}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* ── Architecture note ───────────────────────────────────── */}
      <section className="border-t border-border bg-muted/40 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold tracking-tight">Connected to your campus data</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            User profiles, courses, classes, enrollments, and instructor assignments come from the
            school management API. Attendance sessions, records, permissions, notifications, and
            tap logs live in the attendance service — so dashboards always reflect recorded
            sessions, not demo numbers.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Ready to sign in?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground leading-relaxed">
            Pick the portal that matches your role. You will need credentials issued by your
            institution.
          </p>
          <Button size="lg" className="mt-8 gap-2" onClick={() => scrollTo('portals')}>
            Go to portals
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-border px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield size={14} />
            </div>
            <div>
              <span className="block text-sm font-bold leading-none">{PRODUCT_NAME}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {PRODUCT_TAGLINE}
              </span>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} {PRODUCT_NAME}. Attendance management for educational institutions.
          </p>
          <button
            type="button"
            onClick={() => scrollTo('portals')}
            className="text-sm font-medium text-primary hover:underline"
          >
            Sign in
          </button>
        </div>
      </footer>
    </div>
  );
}
