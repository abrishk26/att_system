//! Pure analytics computation from a raw DB snapshot (no HTTP / side effects).

use std::collections::{HashMap, HashSet};

use chrono::{DateTime, Datelike, NaiveDate, Timelike, Utc};
use uuid::Uuid;

use crate::models::{AttendanceRecord, Session, TapLog};

use super::dto::{
    AnomalyRow, CohortComparePoint, DailyPoint, DayBucket, HeatCell, HourBucket,
    StatusSlice, StudentRiskRow, TapAuditSummary, UniversityKpi,
};

pub struct FilteredSnapshot {
    pub sessions: Vec<Session>,
    pub records: Vec<AttendanceRecord>,
    pub taps: Vec<TapLog>,
}

pub fn apply_time_filter(
    raw: super::snapshot::RawSnapshot,
    from: Option<DateTime<Utc>>,
    to: Option<DateTime<Utc>>,
) -> FilteredSnapshot {
    let session_ids: HashSet<Uuid> = raw
        .sessions
        .iter()
        .filter(|s| {
            let ok_from = from.map(|f| s.created_at >= f).unwrap_or(true);
            let ok_to = to.map(|t| s.created_at <= t).unwrap_or(true);
            ok_from && ok_to
        })
        .map(|s| s.id)
        .collect();

    let sessions: Vec<Session> = raw
        .sessions
        .into_iter()
        .filter(|s| session_ids.contains(&s.id))
        .collect();

    let records: Vec<AttendanceRecord> = raw
        .records
        .into_iter()
        .filter(|r| session_ids.contains(&r.session_id))
        .collect();

    let taps: Vec<TapLog> = raw
        .taps
        .into_iter()
        .filter(|t| session_ids.contains(&t.session_id))
        .collect();

    FilteredSnapshot {
        sessions,
        records,
        taps,
    }
}

pub fn engaged(status: &str) -> bool {
    status == "present" || status == "late"
}

fn present_only(status: &str) -> bool {
    status == "present"
}

pub fn status_distribution(records: &[AttendanceRecord]) -> Vec<StatusSlice> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    for r in records {
        *counts.entry(r.status.clone()).or_insert(0) += 1;
    }
    let total = records.len().max(1);
    let mut v: Vec<StatusSlice> = counts
        .into_iter()
        .map(|(status, count)| StatusSlice {
            status,
            count,
            pct: (count as f64 / total as f64) * 100.0,
        })
        .collect();
    v.sort_by(|a, b| b.count.cmp(&a.count));
    v
}

pub fn tap_audit(taps: &[TapLog]) -> TapAuditSummary {
    let total = taps.len();
    if total == 0 {
        return TapAuditSummary {
            total_taps: 0,
            success_rate: 0.0,
            duplicate_taps: 0,
            unknown_card_taps: 0,
        };
    }
    let ok = taps.iter().filter(|t| t.success).count();
    let dup = taps
        .iter()
        .filter(|t| {
            t.reason
                .as_ref()
                .map(|r| r.contains("duplicate"))
                .unwrap_or(false)
        })
        .count();
    let unk = taps
        .iter()
        .filter(|t| {
            t.reason
                .as_ref()
                .map(|r| r.contains("not recognised") || r.contains("NFC card not"))
                .unwrap_or(false)
        })
        .count();
    TapAuditSummary {
        total_taps: total,
        success_rate: (ok as f64 / total as f64) * 100.0,
        duplicate_taps: dup,
        unknown_card_taps: unk,
    }
}

fn session_record_stats(records: &[AttendanceRecord]) -> (usize, usize, usize, usize) {
    // present, late, absent+excused for denom, engaged count
    let mut p = 0usize;
    let mut l = 0usize;
    let mut ab = 0usize;
    let mut ex = 0usize;
    for r in records {
        match r.status.as_str() {
            "present" => p += 1,
            "late" => l += 1,
            "absent" => ab += 1,
            "excused" => ex += 1,
            _ => ab += 1,
        }
    }
    (p, l, ab, ex)
}

pub fn overall_rates(records: &[AttendanceRecord]) -> (f64, f64, f64, f64, f64) {
    // attendance (present+late)/total, punctuality present/(present+late), excused%, absent%, late%
    let n = records.len();
    if n == 0 {
        return (0.0, 0.0, 0.0, 0.0, 0.0);
    }
    let (p, l, ab, ex) = session_record_stats(records);
    let att = ((p + l) as f64 / n as f64) * 100.0;
    let pl = p + l;
    let punct = if pl > 0 {
        (p as f64 / pl as f64) * 100.0
    } else {
        100.0
    };
    let exc = (ex as f64 / n as f64) * 100.0;
    let abs = (ab as f64 / n as f64) * 100.0;
    let late = (l as f64 / n as f64) * 100.0;
    (att, punct, exc, abs, late)
}

pub fn by_day_of_week(sessions: &[Session], records: &[AttendanceRecord]) -> Vec<DayBucket> {
    let names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    let mut present = vec![0usize; 7];
    let mut late = vec![0usize; 7];
    let mut total = vec![0usize; 7];
    let mut sess_count = vec![0usize; 7];

    for s in sessions.iter().filter(|s| s.status == "finished") {
        let idx = s.created_at.weekday().num_days_from_monday() as usize;
        if idx >= 7 {
            continue;
        }
        sess_count[idx] += 1;
        for r in records.iter().filter(|r| r.session_id == s.id) {
            total[idx] += 1;
            match r.status.as_str() {
                "present" => present[idx] += 1,
                "late" => late[idx] += 1,
                _ => {}
            }
        }
    }

    names
        .iter()
        .enumerate()
        .map(|(i, d)| {
            let att = if total[i] > 0 {
                ((present[i] + late[i]) as f64 / total[i] as f64) * 100.0
            } else {
                0.0
            };
            let pl = present[i] + late[i];
            let punct = if pl > 0 {
                (present[i] as f64 / pl as f64) * 100.0
            } else {
                100.0
            };
            DayBucket {
                day: (*d).to_string(),
                attendance_rate: att,
                punctuality_index: punct,
                sessions: sess_count[i],
                records: total[i],
            }
        })
        .collect()
}

pub fn by_hour(sessions: &[Session], records: &[AttendanceRecord]) -> Vec<HourBucket> {
    let mut hour_present = [0usize; 24];
    let mut hour_total = [0usize; 24];
    let mut hour_sess = [0usize; 24];
    for s in sessions {
        if s.status != "finished" {
            continue;
        }
        let h = s.created_at.hour() as usize;
        if h < 24 {
            hour_sess[h] += 1;
        }
        for r in records.iter().filter(|r| r.session_id == s.id) {
            let hh = s.created_at.hour() as usize;
            if hh < 24 {
                hour_total[hh] += 1;
                if engaged(&r.status) {
                    hour_present[hh] += 1;
                }
            }
        }
    }
    (0u8..24u8)
        .map(|h| {
            let hi = h as usize;
            HourBucket {
                hour: h,
                attendance_rate: if hour_total[hi] > 0 {
                    (hour_present[hi] as f64 / hour_total[hi] as f64) * 100.0
                } else {
                    0.0
                },
                sessions: hour_sess[hi],
            }
        })
        .collect()
}

pub fn daily_timeline(sessions: &[Session], records: &[AttendanceRecord]) -> Vec<DailyPoint> {
    let mut by_date: HashMap<NaiveDate, (usize, usize)> = HashMap::new();
    for s in sessions {
        if s.status != "finished" {
            continue;
        }
        let d = s.created_at.date_naive();
        let recs: Vec<_> = records.iter().filter(|r| r.session_id == s.id).collect();
        let (p, l, ab, ex) = session_record_stats(
            &recs.into_iter().cloned().collect::<Vec<_>>(),
        );
        let total = p + l + ab + ex;
        let eng = p + l;
        let e = by_date.entry(d).or_insert((0, 0));
        e.0 += eng;
        e.1 += total;
    }
    let mut dates: Vec<_> = by_date.keys().copied().collect();
    dates.sort();
    dates
        .into_iter()
        .map(|d| {
            let (eng, tot) = by_date[&d];
            DailyPoint {
                date: d.format("%Y-%m-%d").to_string(),
                attendance_rate: if tot > 0 {
                    (eng as f64 / tot as f64) * 100.0
                } else {
                    0.0
                },
                sessions: sessions
                    .iter()
                    .filter(|s| {
                        s.status == "finished" && s.created_at.date_naive() == d
                    })
                    .count(),
            }
        })
        .collect()
}

pub fn session_heatmap(sessions: &[Session], records: &[AttendanceRecord]) -> Vec<HeatCell> {
    let mut engaged_ct: [[usize; 24]; 7] = [[0; 24]; 7];
    let mut total_ct: [[usize; 24]; 7] = [[0; 24]; 7];
    for s in sessions {
        if s.status != "finished" {
            continue;
        }
        let dow = s.created_at.weekday().num_days_from_monday() as usize;
        let h = s.created_at.hour() as usize;
        if dow >= 7 || h >= 24 {
            continue;
        }
        for r in records.iter().filter(|r| r.session_id == s.id) {
            total_ct[dow][h] += 1;
            if engaged(&r.status) {
                engaged_ct[dow][h] += 1;
            }
        }
    }
    let mut out = Vec::new();
    for dow in 0..7u8 {
        for hour in 0..24u8 {
            let p = engaged_ct[dow as usize][hour as usize];
            let t = total_ct[dow as usize][hour as usize];
            out.push(HeatCell {
                dow,
                hour,
                value: if t > 0 {
                    (p as f64 / t as f64) * 100.0
                } else {
                    0.0
                },
                sessions: sessions
                    .iter()
                    .filter(|s| {
                        s.status == "finished"
                            && s.created_at.weekday().num_days_from_monday() == dow as u32
                            && s.created_at.hour() == hour as u32
                    })
                    .count(),
            });
        }
    }
    out
}

pub fn course_rows(sessions: &[Session], records: &[AttendanceRecord]) -> Vec<(Uuid, usize, usize, f64, f64, f64)> {
    // course_id, finished_sessions, records, att%, punct%, decline (simple: last half vs first half session rate delta)
    let mut by_course: HashMap<Uuid, Vec<&Session>> = HashMap::new();
    for s in sessions {
        if s.status == "finished" {
            by_course.entry(s.course_id).or_default().push(s);
        }
    }
    let mut rows = Vec::new();
    for (cid, mut slist) in by_course {
        slist.sort_by_key(|s| s.created_at);
        let mut present_total = 0usize;
        let mut late_total = 0usize;
        let mut n = 0usize;
        let mut rates: Vec<f64> = Vec::new();
        for s in &slist {
            let recs: Vec<_> = records.iter().filter(|r| r.session_id == s.id).collect();
            let (p, l, ab, ex) = session_record_stats(
                &recs.into_iter().cloned().collect::<Vec<_>>(),
            );
            let tot = p + l + ab + ex;
            if tot == 0 {
                continue;
            }
            let rate = ((p + l) as f64 / tot as f64) * 100.0;
            rates.push(rate);
            present_total += p;
            late_total += l;
            n += tot;
        }
        let att = if n > 0 {
            ((present_total + late_total) as f64 / n as f64) * 100.0
        } else {
            0.0
        };
        let punct = if present_total + late_total > 0 {
            (present_total as f64 / (present_total + late_total) as f64) * 100.0
        } else {
            100.0
        };
        let decline = if rates.len() >= 4 {
            let mid = rates.len() / 2;
            let first: f64 = rates[..mid].iter().sum::<f64>() / mid as f64;
            let second: f64 = rates[mid..].iter().sum::<f64>() / (rates.len() - mid) as f64;
            first - second
        } else {
            0.0
        };
        rows.push((cid, slist.len(), n, att, punct, decline));
    }
    rows.sort_by(|a, b| b.3.partial_cmp(&a.3).unwrap_or(std::cmp::Ordering::Equal));
    rows
}

pub fn section_rows(
    sessions: &[Session],
    records: &[AttendanceRecord],
) -> Vec<(Uuid, Uuid, usize, f64, f64)> {
    // (course, class), sessions, att%, engagement score = att * completion proxy (1.0)
    let mut m: HashMap<(Uuid, Uuid), Vec<&Session>> = HashMap::new();
    for s in sessions {
        if s.status == "finished" {
            m.entry((s.course_id, s.class_id)).or_default().push(s);
        }
    }
    let mut out = Vec::new();
    for ((cid, clid), slist) in m {
        let mut eng = 0usize;
        let mut tot = 0usize;
        for s in &slist {
            let recs: Vec<_> = records.iter().filter(|r| r.session_id == s.id).collect();
            let (p, l, ab, ex) = session_record_stats(
                &recs.into_iter().cloned().collect::<Vec<_>>(),
            );
            tot += p + l + ab + ex;
            eng += p + l;
        }
        let att = if tot > 0 {
            (eng as f64 / tot as f64) * 100.0
        } else {
            0.0
        };
        let score = att;
        out.push((cid, clid, slist.len(), att, score));
    }
    out.sort_by(|a, b| b.3.partial_cmp(&a.3).unwrap_or(std::cmp::Ordering::Equal));
    out
}

pub fn instructor_rows(
    sessions: &[Session],
    records: &[AttendanceRecord],
) -> Vec<(Uuid, usize, usize, f64, f64, f64)> {
    let mut m: HashMap<Uuid, Vec<&Session>> = HashMap::new();
    for s in sessions {
        m.entry(s.instructor_id).or_default().push(s);
    }
    let mut out = Vec::new();
    for (iid, slist) in m {
        let finished: Vec<_> = slist.iter().filter(|s| s.status == "finished").copied().collect();
        let mut eng = 0usize;
        let mut tot = 0usize;
        let mut pres = 0usize;
        let mut late = 0usize;
        for s in &finished {
            let recs: Vec<_> = records.iter().filter(|r| r.session_id == s.id).collect();
            let (p, l, ab, ex) = session_record_stats(
                &recs.into_iter().cloned().collect::<Vec<_>>(),
            );
            tot += p + l + ab + ex;
            eng += p + l;
            pres += p;
            late += l;
        }
        let att = if tot > 0 {
            (eng as f64 / tot as f64) * 100.0
        } else {
            0.0
        };
        let punct = if pres + late > 0 {
            (pres as f64 / (pres + late) as f64) * 100.0
        } else {
            100.0
        };
        let completion = if slist.is_empty() {
            0.0
        } else {
            (finished.len() as f64 / slist.len() as f64) * 100.0
        };
        out.push((iid, slist.len(), finished.len(), att, punct, completion));
    }
    out.sort_by(|a, b| b.3.partial_cmp(&a.3).unwrap_or(std::cmp::Ordering::Equal));
    out
}

fn max_absence_streak(sorted_statuses: &[&str]) -> usize {
    let mut best = 0usize;
    let mut cur = 0usize;
    for st in sorted_statuses {
        if *st == "absent" {
            cur += 1;
            best = best.max(cur);
        } else if *st == "excused" {
            cur = 0;
        } else {
            cur = 0;
        }
    }
    best
}

fn binary_series_variance(bits: &[f64]) -> f64 {
    if bits.is_empty() {
        return 0.0;
    }
    let mean = bits.iter().sum::<f64>() / bits.len() as f64;
    let v = bits.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / bits.len() as f64;
    v.sqrt()
}

pub fn student_risk_rows(sessions: &[Session], records: &[AttendanceRecord], limit: usize) -> Vec<StudentRiskRow> {
    let sess_map: HashMap<Uuid, &Session> = sessions.iter().map(|s| (s.id, s)).collect();
    let mut by_student: HashMap<Uuid, Vec<&AttendanceRecord>> = HashMap::new();
    for r in records {
        if let Some(s) = sess_map.get(&r.session_id) {
            if s.status == "finished" {
                by_student.entry(r.student_id).or_default().push(r);
            }
        }
    }
    let mut rows = Vec::new();
    for (sid, mut recs) in by_student {
        recs.sort_by_key(|r| sess_map.get(&r.session_id).map(|s| s.created_at).unwrap_or(Utc::now()));
        let n = recs.len();
        if n < 2 {
            continue;
        }
        let eng: usize = recs.iter().filter(|r| engaged(&r.status)).count();
        let att = (eng as f64 / n as f64) * 100.0;
        let pres = recs.iter().filter(|r| present_only(&r.status)).count();
        let late = recs.iter().filter(|r| r.status == "late").count();
        let punct = if pres + late > 0 {
            (pres as f64 / (pres + late) as f64) * 100.0
        } else {
            100.0
        };
        let bits: Vec<f64> = recs
            .iter()
            .map(|r| if engaged(&r.status) { 1.0 } else { 0.0 })
            .collect();
        let vol = binary_series_variance(&bits);
        let statuses: Vec<&str> = recs.iter().map(|r| r.status.as_str()).collect();
        let streak = max_absence_streak(&statuses);
        let consistency = (100.0 - vol * 100.0).clamp(0.0, 100.0);
        let risk = ((100.0 - att) * 0.45 + (100.0 - punct) * 0.2 + vol * 40.0 + streak as f64 * 5.0)
            .min(100.0)
            .max(0.0);
        let predicted = att < 65.0 || streak >= 3 || risk > 55.0;
        rows.push(StudentRiskRow {
            student_id: sid,
            student_name: None,
            sessions_count: n,
            attendance_rate: att,
            punctuality_index: punct,
            consistency_score: consistency,
            volatility: vol,
            max_absence_streak: streak,
            risk_score: risk,
            predicted_low: predicted,
        });
    }
    rows.sort_by(|a, b| b.risk_score.partial_cmp(&a.risk_score).unwrap_or(std::cmp::Ordering::Equal));
    rows.truncate(limit);
    rows
}

pub fn anomalies(
    sessions: &[Session],
    records: &[AttendanceRecord],
    taps: &[TapLog],
) -> Vec<AnomalyRow> {
    let mut out = Vec::new();
    for s in sessions {
        if s.status != "finished" {
            continue;
        }
        let recs: Vec<_> = records.iter().filter(|r| r.session_id == s.id).collect();
        let rec_owned: Vec<AttendanceRecord> = recs.iter().map(|r| (*r).clone()).collect();
        let (p, l, ab, ex) = session_record_stats(&rec_owned);
        let tot = p + l + ab + ex;
        if tot == 0 {
            continue;
        }
        let rate = ((p + l) as f64 / tot as f64) * 100.0;
        if rate < 40.0 {
            out.push(AnomalyRow {
                kind: "low_session_attendance".into(),
                severity: "high".into(),
                message: format!(
                    "Session attendance {:.0}% is critically low ({} records).",
                    rate, tot
                ),
                session_id: Some(s.id),
                course_name: None,
                instructor_name: None,
            });
        }
        let all_absent = rec_owned.iter().all(|r| r.status == "absent");
        if tot >= 5 && all_absent {
            out.push(AnomalyRow {
                kind: "all_absent".into(),
                severity: "medium".into(),
                message: "Every enrolled seat is marked absent — verify NFC or manual workflow.".into(),
                session_id: Some(s.id),
                course_name: None,
                instructor_name: None,
            });
        }
    }
    let dup_rate = taps.len().max(1);
    let dup = taps
        .iter()
        .filter(|t| {
            t.reason
                .as_ref()
                .map(|r| r.contains("duplicate"))
                .unwrap_or(false)
        })
        .count();
    if dup * 3 > dup_rate && dup > 5 {
        out.push(AnomalyRow {
            kind: "nfc_duplicate_spike".into(),
            severity: "low".into(),
            message: format!(
                "High duplicate NFC tap volume ({}) relative to total taps ({}) — congestion or reader issues possible.",
                dup,
                taps.len()
            ),
            session_id: None,
            course_name: None,
            instructor_name: None,
        });
    }
    out
}

/// Per (batch year, section, course) finished-session stats.
pub fn batch_section_course_rows(
    sessions: &[Session],
    records: &[AttendanceRecord],
    class_meta: impl Fn(Uuid) -> Option<(i32, i32)>,
) -> Vec<(i32, i32, Uuid, usize, usize, f64, f64)> {
    let mut m: HashMap<(i32, i32, Uuid), Vec<&Session>> = HashMap::new();
    for s in sessions {
        if s.status != "finished" {
            continue;
        }
        let Some((y, sec)) = class_meta(s.class_id) else {
            continue;
        };
        m.entry((y, sec, s.course_id)).or_default().push(s);
    }
    let mut out = Vec::new();
    for ((y, sec, cid), slist) in m {
        let mut eng = 0usize;
        let mut tot = 0usize;
        let mut pres = 0usize;
        let mut late = 0usize;
        let mut rec_n = 0usize;
        for s in &slist {
            let recs: Vec<_> = records.iter().filter(|r| r.session_id == s.id).collect();
            rec_n += recs.len();
            let (p, l, ab, ex) = session_record_stats(
                &recs.into_iter().cloned().collect::<Vec<_>>(),
            );
            tot += p + l + ab + ex;
            eng += p + l;
            pres += p;
            late += l;
        }
        let att = if tot > 0 {
            (eng as f64 / tot as f64) * 100.0
        } else {
            0.0
        };
        let punct = if pres + late > 0 {
            (pres as f64 / (pres + late) as f64) * 100.0
        } else {
            100.0
        };
        out.push((y, sec, cid, slist.len(), rec_n, att, punct));
    }
    out.sort_by(|a, b| {
        a.0.cmp(&b.0)
            .then(a.1.cmp(&b.1))
            .then(b.5.partial_cmp(&a.5).unwrap_or(std::cmp::Ordering::Equal))
    });
    out
}

/// Roll up all courses in a batch year + section.
pub fn batch_section_rows(
    sessions: &[Session],
    records: &[AttendanceRecord],
    class_meta: impl Fn(Uuid) -> Option<(i32, i32)>,
) -> Vec<(i32, i32, usize, usize, usize, f64, f64)> {
    let mut m: HashMap<(i32, i32), (Vec<&Session>, HashSet<Uuid>)> = HashMap::new();
    for s in sessions {
        if s.status != "finished" {
            continue;
        }
        let Some((y, sec)) = class_meta(s.class_id) else {
            continue;
        };
        let e = m.entry((y, sec)).or_default();
        e.0.push(s);
        e.1.insert(s.course_id);
    }
    let mut out = Vec::new();
    for ((y, sec), (slist, courses)) in m {
        let mut eng = 0usize;
        let mut tot = 0usize;
        let mut pres = 0usize;
        let mut late = 0usize;
        let mut rec_n = 0usize;
        for s in &slist {
            let recs: Vec<_> = records.iter().filter(|r| r.session_id == s.id).collect();
            rec_n += recs.len();
            let (p, l, ab, ex) = session_record_stats(
                &recs.into_iter().cloned().collect::<Vec<_>>(),
            );
            tot += p + l + ab + ex;
            eng += p + l;
            pres += p;
            late += l;
        }
        let att = if tot > 0 {
            (eng as f64 / tot as f64) * 100.0
        } else {
            0.0
        };
        let punct = if pres + late > 0 {
            (pres as f64 / (pres + late) as f64) * 100.0
        } else {
            100.0
        };
        out.push((y, sec, slist.len(), rec_n, courses.len(), att, punct));
    }
    out.sort_by(|a, b| a.0.cmp(&b.0).then(a.1.cmp(&b.1)));
    out
}

pub fn cohort_by_class_year(
    sessions: &[Session],
    records: &[AttendanceRecord],
    class_year_fn: impl Fn(Uuid) -> Option<i32>,
) -> Vec<CohortComparePoint> {
    let mut m: HashMap<i32, (usize, usize)> = HashMap::new();
    for s in sessions {
        if s.status != "finished" {
            continue;
        }
        let y = class_year_fn(s.class_id).unwrap_or(-1);
        if y < 0 {
            continue;
        }
        let recs: Vec<_> = records.iter().filter(|r| r.session_id == s.id).collect();
        let (p, l, ab, ex) = session_record_stats(
            &recs.into_iter().cloned().collect::<Vec<_>>(),
        );
        let tot = p + l + ab + ex;
        let eng = p + l;
        let e = m.entry(y).or_insert((0, 0));
        e.0 += eng;
        e.1 += tot;
    }
    let mut ys: Vec<_> = m.keys().copied().collect();
    ys.sort();
    ys.into_iter()
        .map(|y| {
            let (eng, tot) = m[&y];
            CohortComparePoint {
                label: format!("Year {}", y),
                attendance_rate: if tot > 0 {
                    (eng as f64 / tot as f64) * 100.0
                } else {
                    0.0
                },
                count: tot,
            }
        })
        .collect()
}

pub fn build_kpi(sessions: &[Session], records: &[AttendanceRecord]) -> UniversityKpi {
    let finished = sessions.iter().filter(|s| s.status == "finished").count();
    let active = sessions.iter().filter(|s| s.status == "active").count();
    let incoming = sessions.iter().filter(|s| s.status == "incoming").count();
    let stu: HashSet<_> = records.iter().map(|r| r.student_id).collect();
    let inst: HashSet<_> = sessions.iter().map(|s| s.instructor_id).collect();
    let offerings: HashSet<_> = sessions
        .iter()
        .map(|s| (s.course_id, s.class_id))
        .collect();
    let (att, punct, exc, abs, late) = overall_rates(records);
    let finished_sessions: Vec<_> = sessions.iter().filter(|s| s.status == "finished").collect();
    let with_records = finished_sessions
        .iter()
        .filter(|s| records.iter().any(|r| r.session_id == s.id))
        .count();
    let record_completeness = if finished_sessions.is_empty() {
        100.0
    } else {
        (with_records as f64 / finished_sessions.len() as f64) * 100.0
    };
    UniversityKpi {
        total_sessions: sessions.len(),
        finished_sessions: finished,
        active_sessions: active,
        incoming_sessions: incoming,
        unique_students: stu.len(),
        unique_instructors: inst.len(),
        unique_course_offerings: offerings.len(),
        overall_attendance_rate: att,
        punctuality_index: punct,
        excused_rate: exc,
        absent_rate: abs,
        late_rate: late,
        record_completeness,
    }
}
