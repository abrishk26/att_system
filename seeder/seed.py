"""
Full two-database seeder  —  data_source + att_system
Run:  uv run seed.py
.env must contain DATA_SOURCE_DATABASE_URL and ATT_SYSTEM_DATABASE_URL
"""
import os, random, uuid
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

load_dotenv()
DS_URL  = os.environ["DATA_SOURCE_DATABASE_URL"]
ATT_URL = os.environ["ATT_SYSTEM_DATABASE_URL"]

# ── helpers ───────────────────────────────────────────────────────────────────
def uid():  return str(uuid.uuid4())
def utc():  return datetime.now(timezone.utc)
def ago(days, hours=0):
    return utc() - timedelta(days=days, hours=hours)

# ── Fixed class UUIDs ─────────────────────────────────────────────────────────
CLS = {
    (1,1):"8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0001",
    (1,2):"8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0002",
    (2,1):"8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0003",
    (2,2):"8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0004",
    (3,1):"8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0005",
    (3,2):"8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0006",
    (4,1):"8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0007",
    (4,2):"8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0008",
}
DEMO_CLASS = CLS[(3,1)]   # the main demo class — 35 students

# ── Fixed accounts (spec) ─────────────────────────────────────────────────────
FIXED_PROFILES = [
    ("8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0010","Abreham",    "Kassa",   "abreham",   "abreham123",None,"student"),
    ("8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0011","Ephrem",     "Ayalew",  "ephrem",    "ephrem123", None,"student"),
    ("8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0012","Oumer",      "Habib",   "oumer",     "oumer123",  None,"student"),
    ("8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0013","Nebiyou",    "Tsegaye", "nebiyou",   "nebiyou123",None,"student"),
    ("8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0014","Abreham",    "Teshome", "abreham.t", "abreham123",None,"student"),
    ("8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0015","Andargachew","Asfaw",   "andy",      "123456",    None,"instructor"),
    ("8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0016","Admin",      "User",    "admin",     "admin123",  None,"admin"),
]
FIXED_STUDENTS = [
    ("8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0010",DEMO_CLASS,"0499fe624a6680"),
    ("8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0011",DEMO_CLASS,"04fcdd624a6680"),
    ("8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0012",DEMO_CLASS,"295F3141"),
    ("8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0013",DEMO_CLASS,"59fe3941"),
    ("8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0014",DEMO_CLASS,"e9c9d69b"),
]
ANDY_ID = "8d4f7d12-1c2b-4f8f-9e2a-7d5c2a1f0015"

# ── Extra instructors (6 total including andy) ────────────────────────────────
EXTRA_INSTRUCTORS = [
    ("Mekaeel","Haile",   "dr.mekaeel","admin123"),
    ("Selam",  "Bekele",  "selam.b",   "admin123"),
    ("Yonas",  "Girma",   "yonas.g",   "admin123"),
    ("Tigist", "Alemu",   "tigist.a",  "admin123"),
    ("Dawit",  "Tesfaye", "dawit.t",   "admin123"),
]
EXTRA_INSTR_IDS = [uid() for _ in EXTRA_INSTRUCTORS]

# ── 30 extra students for DEMO_CLASS ─────────────────────────────────────────
EXTRA_STUDENTS = [
    ("Biruk",   "Hailu",   "biruk.h"),  ("Meron",   "Tadesse", "meron.t"),
    ("Hana",    "Worku",   "hana.w"),   ("Kaleb",   "Desta",   "kaleb.d"),
    ("Sara",    "Mulugeta","sara.m"),   ("Yared",   "Bekele",  "yared.b"),
    ("Liya",    "Girma",   "liya.g"),   ("Naol",    "Tesfaye", "naol.t"),
    ("Feven",   "Alemu",   "feven.a"),  ("Robel",   "Haile",   "robel.h"),
    ("Tsion",   "Abebe",   "tsion.a"),  ("Mikias",  "Kebede",  "mikias.k"),
    ("Eden",    "Teshome", "eden.t"),   ("Henok",   "Mekonnen","henok.m"),
    ("Bethel",  "Assefa",  "bethel.a"), ("Dawit",   "Lemma",   "dawit.l"),
    ("Selam",   "Hailu",   "selam.h"),  ("Yonas",   "Tadesse", "yonas.t"),
    ("Tigist",  "Worku",   "tigist.w"), ("Abebe",   "Desta",   "abebe.d"),
    ("Mekdes",  "Mulugeta","mekdes.m"), ("Surafel", "Bekele",  "surafel.b"),
    ("Hiwot",   "Girma",   "hiwot.g"),  ("Bereket", "Tesfaye", "bereket.t"),
    ("Mahlet",  "Alemu",   "mahlet.a"), ("Eyob",    "Haile",   "eyob.h"),
    ("Lidya",   "Abebe",   "lidya.a"),  ("Tewodros","Kebede",  "tewodros.k"),
    ("Azeb",    "Teshome", "azeb.t"),   ("Girma",   "Mekonnen","girma.m"),
]
EXTRA_STU_IDS = [uid() for _ in EXTRA_STUDENTS]

# ── 20 students per other class (for other instructors) ──────────────────────
OTHER_CLASS_STUDENTS = {}   # class_id -> [student_ids]  (filled during seeding)

# ── Courses ───────────────────────────────────────────────────────────────────
COURSES = [
    ("cs101",  "INSY 1011","Introduction to Programming"),
    ("cs102",  "INSY 1012","Data Structures & Algorithms"),
    ("cs201",  "INSY 2011","Database Management Systems"),
    ("cs202",  "INSY 2012","Software Engineering"),
    ("cs301",  "INSY 3011","Artificial Intelligence"),
    ("cs302",  "INSY 3012","Computer Networks"),
    ("cs401",  "INSY 4011","Operating Systems"),
    ("cs402",  "INSY 4012","Cloud Computing"),
    ("math101","MATH 1011","Calculus I"),
    ("math201","MATH 2011","Linear Algebra"),
    ("phys101","PHYS 1011","Engineering Physics"),
    ("hum101", "HUM 1011", "Professional Ethics"),
    ("eng101", "ENG 1011", "Academic Writing"),
    ("mgmt201","MGMT 2011","Project Management"),
    ("sure101","SURE 1011","Sustainable Energy"),
]
COURSE_IDS = {k: uid() for k,_,_ in COURSES}

# ── Andy's 5 courses (demo class) ─────────────────────────────────────────────
ANDY_COURSES = ["cs301","cs302","cs201","cs202","math201"]

# ── Per-student attendance profiles (for rich analytics) ─────────────────────
# Each profile: (present_pct, late_pct)  — rest is absent
# We assign a profile to each student deterministically
PROFILES = [
    (92, 5),   # excellent
    (88, 7),   # good
    (85, 8),   # good
    (80, 8),   # average
    (75, 10),  # average
    (70, 10),  # below average
    (60, 8),   # poor — triggers low-attendance notifications
    (50, 5),   # very poor
    (40, 5),   # critical
    (30, 3),   # at-risk
]

# ── Per-course attendance bias (makes course comparison charts interesting) ───
# key -> present_pct modifier  (-15 to +10)
COURSE_BIAS = {
    "cs301": +8,   # AI — popular, high attendance
    "cs302": +5,   # Networks — good
    "cs201": +2,   # DB — average
    "cs202": -3,   # SE — slightly lower
    "math201":-10, # Linear Algebra — hardest, lowest attendance
    "cs101": +6,
    "cs102": +3,
    "cs401": -5,
    "cs402": +4,
    "math101":-8,
    "phys101":-6,
    "hum101": +9,
    "eng101": +7,
    "mgmt201":+1,
    "sure101":+3,
}

DAYS      = ["Monday","Tuesday","Wednesday","Thursday","Friday"]
SLOTS     = [("08:00","09:30"),("09:45","11:15"),("11:30","13:00"),
             ("14:00","15:30"),("15:45","17:15")]
ROOMS     = ["A101","A102","B201","B202","C301","C302","D401","Lab1","Lab2"]

PERM_REASONS = [
    "I was sick and had a medical appointment at the hospital.",
    "Family emergency required my immediate presence at home.",
    "I had a scheduled university entrance exam for a scholarship.",
    "I was attending a mandatory government service registration.",
    "My transportation broke down and I could not reach campus in time.",
    "I had a pre-approved internship interview at a local company.",
    "I was participating in a national sports competition representing the university.",
    "I had a severe migraine and could not attend class.",
    "I was required to accompany a sick family member to the clinic.",
    "I had a conflict with another mandatory exam scheduled at the same time.",
    "I was attending a funeral of a close relative.",
    "I had a dental emergency and needed urgent treatment.",
    "I was participating in a university-approved community service event.",
    "I had a visa appointment at the embassy that could not be rescheduled.",
    "I was involved in a minor accident on the way to campus.",
]

LOW_ATT_THRESHOLD = 65   # below this → low-attendance notification

def att_status(present_pct, late_pct):
    r = random.random() * 100
    if r < present_pct:   return "present"
    if r < present_pct + late_pct: return "late"
    return "absent"

# ─────────────────────────────────────────────────────────────────────────────
# DATA SOURCE
# ─────────────────────────────────────────────────────────────────────────────
def seed_ds(conn):
    cur = conn.cursor()
    print("\n=== data_source ===")
    cur.execute("TRUNCATE assignments,enrollments,students,instructors,courses,classes,profiles CASCADE")

    # classes
    execute_values(cur,"INSERT INTO classes(id,year,section) VALUES %s",
        [(v,k[0],k[1]) for k,v in CLS.items()])

    # fixed profiles
    execute_values(cur,
        "INSERT INTO profiles(id,first_name,last_name,username,password_hash,img_url,role) VALUES %s",
        FIXED_PROFILES)

    # extra instructor profiles
    execute_values(cur,
        "INSERT INTO profiles(id,first_name,last_name,username,password_hash,img_url,role) VALUES %s",
        [(EXTRA_INSTR_IDS[i],fn,ln,un,pw,None,"instructor")
         for i,(fn,ln,un,pw) in enumerate(EXTRA_INSTRUCTORS)])

    # extra student profiles (demo class)
    execute_values(cur,
        "INSERT INTO profiles(id,first_name,last_name,username,password_hash,img_url,role) VALUES %s",
        [(EXTRA_STU_IDS[i],fn,ln,un,"password123",None,"student")
         for i,(fn,ln,un) in enumerate(EXTRA_STUDENTS)])

    # other-class student profiles (20 per non-demo class)
    other_class_ids = [v for k,v in CLS.items() if v != DEMO_CLASS]
    other_stu_profiles = []
    other_stu_students = []
    for cid in other_class_ids:
        ids = []
        for j in range(20):
            sid = uid()
            ids.append(sid)
            fn = f"Student{cid[:4]}{j}"
            other_stu_profiles.append((sid,fn,"","s"+sid[:6],"password123",None,"student"))
            other_stu_students.append((sid,cid,uid()[:8].upper()))
        OTHER_CLASS_STUDENTS[cid] = ids

    execute_values(cur,
        "INSERT INTO profiles(id,first_name,last_name,username,password_hash,img_url,role) VALUES %s",
        other_stu_profiles)

    # instructors table
    all_instr = [ANDY_ID] + EXTRA_INSTR_IDS
    execute_values(cur,"INSERT INTO instructors(id) VALUES %s",[(i,) for i in all_instr])

    # students table — fixed
    execute_values(cur,"INSERT INTO students(id,class_id,nfc_id) VALUES %s", FIXED_STUDENTS)
    # extra demo-class students
    execute_values(cur,"INSERT INTO students(id,class_id,nfc_id) VALUES %s",
        [(EXTRA_STU_IDS[i],DEMO_CLASS,uid()[:8].upper()) for i in range(len(EXTRA_STUDENTS))])
    # other-class students
    execute_values(cur,"INSERT INTO students(id,class_id,nfc_id) VALUES %s", other_stu_students)

    # courses
    execute_values(cur,"INSERT INTO courses(id,course_id,name) VALUES %s",
        [(COURSE_IDS[k],code,name) for k,code,name in COURSES])

    # ── assignments ───────────────────────────────────────────────────────────
    used_slots = set()
    def pick_slot(cid):
        for _ in range(60):
            d = random.choice(DAYS); s = random.choice(SLOTS)
            key = (cid,d,s[0])
            if key not in used_slots:
                used_slots.add(key); return d,s[0],s[1]
        return None,None,None

    asgn_rows = []
    # Andy → DEMO_CLASS, 5 courses
    for ck in ANDY_COURSES:
        d,st,et = pick_slot(DEMO_CLASS)
        asgn_rows.append((uid(),ANDY_ID,DEMO_CLASS,COURSE_IDS[ck],d,st,et,random.choice(ROOMS)))

    # Extra instructors → 3-4 courses each, spread across other classes
    course_keys = list(COURSE_IDS.keys())
    for idx,iid in enumerate(EXTRA_INSTR_IDS):
        chosen_cls = other_class_ids[idx % len(other_class_ids)]
        for ck in random.sample(course_keys, random.randint(3,4)):
            d,st,et = pick_slot(chosen_cls)
            asgn_rows.append((uid(),iid,chosen_cls,COURSE_IDS[ck],d,st,et,random.choice(ROOMS)))

    execute_values(cur,
        "INSERT INTO assignments(id,instructor_id,class_id,course_id,day,start_time,end_time,room) VALUES %s",
        asgn_rows)

    # ── enrollments ───────────────────────────────────────────────────────────
    seen = set()
    enroll_rows = []
    def enroll(sid,cid):
        if (sid,cid) not in seen:
            seen.add((sid,cid)); enroll_rows.append((uid(),sid,cid))

    fixed_ids = [r[0] for r in FIXED_STUDENTS]
    andy_cids = [COURSE_IDS[k] for k in ANDY_COURSES]
    other_cids = [COURSE_IDS[k] for k in course_keys if k not in ANDY_COURSES]

    # Fixed + extra demo students → all andy courses + 2 random others
    for sid in fixed_ids + EXTRA_STU_IDS:
        for cid in andy_cids: enroll(sid,cid)
        for cid in random.sample(other_cids,2): enroll(sid,cid)

    # Other-class students → courses matching their instructor's assignments
    for asgn in asgn_rows:
        _,iid,cls_id,crs_id,*_ = asgn
        if cls_id == DEMO_CLASS: continue
        for sid in OTHER_CLASS_STUDENTS.get(cls_id,[]):
            enroll(sid,crs_id)

    execute_values(cur,"INSERT INTO enrollments(id,student_id,course_id) VALUES %s", enroll_rows)

    conn.commit(); cur.close()
    print(f"  classes={len(CLS)}  instructors={len(all_instr)}")
    total_stu = len(fixed_ids)+len(EXTRA_STU_IDS)+sum(len(v) for v in OTHER_CLASS_STUDENTS.values())
    print(f"  students={total_stu}  (demo_class={len(fixed_ids)+len(EXTRA_STU_IDS)})")
    print(f"  courses={len(COURSES)}  assignments={len(asgn_rows)}  enrollments={len(enroll_rows)}")

    return {
        "asgn": asgn_rows,
        "fixed_ids": fixed_ids,
        "extra_stu_ids": EXTRA_STU_IDS,
        "demo_students": fixed_ids + EXTRA_STU_IDS,
        "andy_cids": andy_cids,
        "enrollments": seen,
        "other_class_students": OTHER_CLASS_STUDENTS,
    }

# ─────────────────────────────────────────────────────────────────────────────
# ATT SYSTEM
# ─────────────────────────────────────────────────────────────────────────────
def seed_att(conn, ds):
    cur = conn.cursor()
    print("\n=== att_system ===")
    cur.execute("TRUNCATE attendance_record,permissions,sessions,notifications,tap_log CASCADE")

    asgn        = ds["asgn"]
    demo_stus   = ds["demo_students"]   # 35 students in DEMO_CLASS
    enrollments = ds["enrollments"]
    other_cls   = ds["other_class_students"]

    # Assign a per-student attendance profile (deterministic by index)
    stu_profile = {}
    for i,sid in enumerate(demo_stus):
        stu_profile[sid] = PROFILES[i % len(PROFILES)]
    for cid,sids in other_cls.items():
        for i,sid in enumerate(sids):
            stu_profile[sid] = PROFILES[i % len(PROFILES)]

    sess_rows  = []
    rec_rows   = []
    perm_rows  = []
    notif_rows = []

    # Track per-student cumulative attendance for low-attendance notifications
    stu_present = {}   # sid -> [bool, ...]
    stu_instr   = {}   # sid -> instructor_id (last seen)

    for asgn_row in asgn:
        _, instr_id, cls_id, crs_id, *_ = asgn_row

        # Students eligible for this assignment
        if cls_id == DEMO_CLASS:
            eligible = [s for s in demo_stus if (s,crs_id) in enrollments]
        else:
            eligible = [s for s in other_cls.get(cls_id,[]) if (s,crs_id) in enrollments]

        if not eligible: continue

        # Course bias
        crs_key = next((k for k,_,_ in COURSES if COURSE_IDS[k]==crs_id), None)
        bias = COURSE_BIAS.get(crs_key, 0)

        # 20 sessions per assignment spread over 90 days
        n = 20
        for i in range(n):
            sess_id = uid()
            days_back = int((n - i) * (90/n)) + random.randint(0,3)
            created = ago(days_back, random.randint(0,8))

            # Last 1-2 sessions: active or incoming for live demo
            if i >= n-2 and random.random() < 0.4:
                status = random.choice(["incoming","active"])
            else:
                status = "finished"

            sess_rows.append((sess_id,instr_id,cls_id,crs_id,status,created))
            if status != "finished": continue

            sess_present = 0
            sess_total   = len(eligible)

            for sid in eligible:
                base_p, base_l = stu_profile.get(sid, (75,8))
                p_pct = max(20, min(95, base_p + bias))
                l_pct = base_l
                status_att = att_status(p_pct, l_pct)

                rec_rows.append((uid(),sid,sess_id,status_att,None))
                stu_instr[sid] = instr_id

                is_present = status_att == "present"
                if is_present: sess_present += 1
                stu_present.setdefault(sid,[]).append(is_present)

                # Permission for absent students (45% chance)
                if status_att == "absent" and random.random() < 0.45:
                    p_status = random.choices(
                        ["pending","accepted","rejected"],
                        weights=[25,55,20])[0]
                    perm_created = created + timedelta(hours=random.randint(1,10))
                    perm_rows.append((
                        uid(),sess_id,sid,
                        random.choice(PERM_REASONS),
                        None, p_status, perm_created
                    ))
                    # Notify instructor of pending permission
                    if p_status == "pending":
                        notif_rows.append((
                            uid(), instr_id,
                            "New Permission Request",
                            "A student submitted a permission request for a missed session.",
                            "permission", False, None, perm_created
                        ))
                    # Notify student of decision
                    if p_status in ("accepted","rejected"):
                        msg = ("Your permission request was accepted and attendance updated to excused."
                               if p_status=="accepted"
                               else "Your permission request was reviewed and not approved.")
                        notif_rows.append((
                            uid(), sid,
                            f"Permission {p_status.capitalize()}",
                            msg, "permission_update", False, None,
                            perm_created + timedelta(hours=random.randint(2,24))
                        ))

            # Session-start notification (students)
            for sid in eligible:
                notif_rows.append((
                    uid(), sid,
                    "Session Started",
                    "Your attendance session is now open. Present your NFC card.",
                    "session_started", True, None, created
                ))

        # After all sessions for this assignment, check low-attendance students
        for sid in eligible:
            history = stu_present.get(sid,[])
            if len(history) >= 5:
                rate = sum(history)/len(history)*100
                if rate < LOW_ATT_THRESHOLD:
                    notif_rows.append((
                        uid(), sid,
                        "Low Attendance Warning",
                        f"Your attendance rate is {rate:.0f}%. You risk losing course credit if it drops below 60%.",
                        "low_attendance", False, "/student/history", ago(1)
                    ))
                    notif_rows.append((
                        uid(), stu_instr.get(sid, instr_id),
                        "Student Low Attendance Alert",
                        f"A student in your course has attendance below {LOW_ATT_THRESHOLD}% ({rate:.0f}%). Consider reaching out.",
                        "low_attendance", False, None, ago(1)
                    ))

    # ── bulk inserts ──────────────────────────────────────────────────────────
    print(f"  Inserting {len(sess_rows)} sessions...")
    execute_values(cur,
        "INSERT INTO sessions(id,instructor_id,class_id,course_id,status,created_at) VALUES %s",
        sess_rows)

    print(f"  Inserting {len(rec_rows)} attendance records...")
    execute_values(cur,
        "INSERT INTO attendance_record(id,student_id,session_id,status,client_id) VALUES %s",
        rec_rows)

    print(f"  Inserting {len(perm_rows)} permissions...")
    execute_values(cur,
        "INSERT INTO permissions(id,session_id,student_id,description,img_url,status,created_at) VALUES %s",
        perm_rows)

    # Cap notifications at 500 to keep it manageable
    notif_rows = notif_rows[:500]
    print(f"  Inserting {len(notif_rows)} notifications...")
    if notif_rows:
        execute_values(cur,
            "INSERT INTO notifications(id,user_id,title,message,notification_type,is_read,action_url,created_at) VALUES %s",
            notif_rows)

    conn.commit(); cur.close()

    # ── summary ───────────────────────────────────────────────────────────────
    fin = sum(1 for r in sess_rows if r[4]=="finished")
    act = sum(1 for r in sess_rows if r[4]=="active")
    inc = sum(1 for r in sess_rows if r[4]=="incoming")
    pr  = sum(1 for r in rec_rows  if r[3]=="present")
    lt  = sum(1 for r in rec_rows  if r[3]=="late")
    ab  = sum(1 for r in rec_rows  if r[3]=="absent")
    pe  = sum(1 for r in perm_rows if r[5]=="pending")
    ac  = sum(1 for r in perm_rows if r[5]=="accepted")
    rj  = sum(1 for r in perm_rows if r[5]=="rejected")
    print(f"\n  Sessions     : {len(sess_rows)}  (finished={fin}, active={act}, incoming={inc})")
    print(f"  Records      : {len(rec_rows)}  (present={pr}, late={lt}, absent={ab})")
    print(f"  Permissions  : {len(perm_rows)}  (pending={pe}, accepted={ac}, rejected={rj})")
    print(f"  Notifications: {len(notif_rows)}")

# ─────────────────────────────────────────────────────────────────────────────
def main():
    random.seed(42)
    print("Connecting...")
    ds_conn  = psycopg2.connect(DS_URL)
    att_conn = psycopg2.connect(ATT_URL)
    try:
        ds_data = seed_ds(ds_conn)
        seed_att(att_conn, ds_data)
    finally:
        ds_conn.close()
        att_conn.close()

    print("\n✓  Done.\n")
    print("Credentials:")
    print("  abreham   / abreham123   (student)")
    print("  ephrem    / ephrem123    (student)")
    print("  oumer     / oumer123     (student)")
    print("  nebiyou   / nebiyou123   (student)")
    print("  abreham.t / abreham123   (student)")
    print("  andy      / 123456       (instructor)")
    print("  dr.mekaeel/ admin123     (instructor)")
    print("  admin     / admin123     (admin)")

if __name__ == "__main__":
    main()
