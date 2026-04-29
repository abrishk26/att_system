import os
import uuid
import random
import psycopg2
from faker import Faker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

fake = Faker()

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/as")

def get_connection():
    try:
        return psycopg2.connect(DATABASE_URL)
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def seed_all():
    conn = get_connection()
    if not conn:
        return

    cur = conn.cursor()

    try:
        print("--- Starting Comprehensive Database Seeding ---")

        # 1. Clear existing data
        print("Clearing existing data...")
        tables = [
            "attendance_record", "sessions", "permissions", 
            "assignments", "enrollments", "students", 
            "instructors", "courses", "classes", "profiles"
        ]
        cur.execute(f"TRUNCATE {', '.join(tables)} CASCADE")

        # 2. Seed Classes
        print("Seeding classes...")
        class_ids = []
        for year in range(1, 5):
            for section in range(1, 3):
                cid = str(uuid.uuid4())
                cur.execute("INSERT INTO classes (id, year, section) VALUES (%s, %s, %s)", (cid, year, section))
                class_ids.append(cid)

        # 3. Seed Profiles (Admin, Instructors, Students)
        print("Seeding profiles...")
        
        # Admin
        cur.execute(
            "INSERT INTO profiles (id, first_name, last_name, username, password_hash, role) VALUES (%s, %s, %s, %s, %s, %s)",
            (str(uuid.uuid4()), "System", "Admin", "admin", "admin123", "admin")
        )

        # Instructors
        instructor_ids = []
        predefined_instructors = [("Mekaeel", "Mekaeel", "dr.mekaeel")]
        for first, last, uname in predefined_instructors:
            iid = str(uuid.uuid4())
            cur.execute("INSERT INTO profiles (id, first_name, last_name, username, password_hash, role) VALUES (%s, %s, %s, %s, %s, %s)", (iid, first, last, uname, "admin123", "instructor"))
            cur.execute("INSERT INTO instructors (id) VALUES (%s)", (iid,))
            instructor_ids.append(iid)

        for _ in range(4):
            iid = str(uuid.uuid4())
            cur.execute("INSERT INTO profiles (id, first_name, last_name, username, password_hash, role) VALUES (%s, %s, %s, %s, %s, %s)", (iid, fake.first_name(), fake.last_name(), f"prof.{fake.first_name().lower()}", "admin123", "instructor"))
            cur.execute("INSERT INTO instructors (id) VALUES (%s)", (iid,))
            instructor_ids.append(iid)

        # Students
        student_data = [] # (id, class_id)
        predefined_students = [("Alice", "Johnson", "alice.j"), ("Bob", "Smith", "bob.s"), ("Charlie", "Brown", "charlie.b"), ("Diana", "Prince", "diana.p")]
        for first, last, uname in predefined_students:
            sid = str(uuid.uuid4())
            cid = random.choice(class_ids)
            cur.execute("INSERT INTO profiles (id, first_name, last_name, username, password_hash, role) VALUES (%s, %s, %s, %s, %s, %s)", (sid, first, last, uname, "password123", "student"))
            cur.execute("INSERT INTO students (id, class_id, nfc_id) VALUES (%s, %s, %s)", (sid, cid, str(uuid.uuid4())[:8].upper()))
            student_data.append((sid, cid))

        for _ in range(46):
            sid = str(uuid.uuid4())
            cid = random.choice(class_ids)
            cur.execute("INSERT INTO profiles (id, first_name, last_name, username, password_hash, role) VALUES (%s, %s, %s, %s, %s, %s)", (sid, fake.first_name(), fake.last_name(), f"{fake.first_name().lower()}.{random.randint(100, 999)}", "password123", "student"))
            cur.execute("INSERT INTO students (id, class_id, nfc_id) VALUES (%s, %s, %s)", (sid, cid, str(uuid.uuid4())[:8].upper()))
            student_data.append((sid, cid))

        # 4. Seed Courses
        print("Seeding courses...")
        course_list = [("CS101", "Programming"), ("CS201", "DBMS"), ("CS301", "AI"), ("CS401", "OS"), ("MATH101", "Calculus")]
        course_ids = []
        for code, name in course_list:
            cuid = str(uuid.uuid4())
            cur.execute("INSERT INTO courses (id, course_id, name) VALUES (%s, %s, %s)", (cuid, code, name))
            course_ids.append(cuid)

        # 5. Seed Enrollments & Assignments
        print("Seeding enrollments and assignments...")
        for sid, _ in student_data:
            for cuid in random.sample(course_ids, random.randint(3, 5)):
                cur.execute("INSERT INTO enrollments (id, student_id, course_id) VALUES (%s, %s, %s)", (str(uuid.uuid4()), sid, cuid))

        assignments = [] # (inst_id, class_id, course_id)
        for iid in instructor_ids:
            for _ in range(random.randint(2, 4)):
                cid, cuid = random.choice(class_ids), random.choice(course_ids)
                aid = str(uuid.uuid4())
                cur.execute("INSERT INTO assignments (id, instructor_id, class_id, course_id) VALUES (%s, %s, %s, %s)", (aid, iid, cid, cuid))
                assignments.append((iid, cid, cuid))

        # 6. Seed Sessions & Attendance Records
        print("Seeding sessions and attendance...")
        for inst_id, class_id, course_id in assignments:
            # Find students in this class enrolled in this course
            cur.execute("""
                SELECT s.id FROM students s
                JOIN enrollments e ON s.id = e.student_id
                WHERE s.class_id = %s AND e.course_id = %s
            """, (class_id, course_id))
            students_in_session = [row[0] for row in cur.fetchall()]

            if not students_in_session: continue

            for i in range(random.randint(5, 10)):
                session_id = str(uuid.uuid4())
                status = 'completed' if i < 4 or random.random() > 0.3 else random.choice(['ongoing', 'incoming'])
                cur.execute("INSERT INTO sessions (id, instructor_id, class_id, course_id, status) VALUES (%s, %s, %s, %s, %s)", (session_id, inst_id, class_id, course_id, status))

                if status == 'completed':
                    for sid in students_in_session:
                        rand = random.random()
                        att_status = 'present' if rand < 0.8 else 'late' if rand < 0.9 else 'absent'
                        cur.execute("INSERT INTO attendance_record (id, student_id, session_id, status) VALUES (%s, %s, %s, %s)", (str(uuid.uuid4()), sid, session_id, att_status))

        print("--- Seeding Complete Successfully ---")
        conn.commit()

    except Exception as e:
        print(f"Error during seeding: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_all()
