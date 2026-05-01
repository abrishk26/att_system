import os
import uuid
import random
import psycopg2
from faker import Faker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

fake = Faker()

# Database URLs
# If specific URLs are not provided, fallback to DATABASE_URL, then to a default
DEFAULT_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/as")
DATA_SOURCE_URL = os.environ.get("DATA_SOURCE_DATABASE_URL", DEFAULT_URL)
ATT_SYSTEM_URL = os.environ.get("ATT_SYSTEM_DATABASE_URL", DEFAULT_URL)

def get_conn(url):
    try:
        return psycopg2.connect(url)
    except Exception as e:
        print(f"Error connecting to database ({url}): {e}")
        return None

def fetch_data(conn):
    """Fetch all core data from data_source."""
    cur = conn.cursor()
    data = {}
    
    tables = ["profiles", "classes", "instructors", "students", "courses", "enrollments", "assignments"]
    for table in tables:
        cur.execute(f"SELECT * FROM {table}")
        colnames = [desc[0] for desc in cur.description]
        data[table] = [dict(zip(colnames, row)) for row in cur.fetchall()]
    
    cur.close()
    return data

def push_data(conn, data):
    """Push core data to att_system and generate attendance data."""
    cur = conn.cursor()
    
    try:
        print("--- Clearing existing data in att_system ---")
        tables_to_clear = [
            "attendance_record", "sessions", "permissions"
        ]
        cur.execute(f"TRUNCATE {', '.join(tables_to_clear)} CASCADE")
        
        print("--- Generating Attendance Data in att_system ---")
        
        # 1. Generate Sessions
        # For each assignment in data_source, create 5-10 sessions in att_system
        assignments = data["assignments"]
        
        print(f"Found {len(assignments)} assignments in Data Source.")
        
        for assignment in assignments:
            # We need to find which students are in this class AND enrolled in this course
            class_id = assignment["class_id"]
            course_id = assignment["course_id"]
            
            # Find students in this class
            students_in_class = [s["id"] for s in data["students"] if s["class_id"] == class_id]
            # Find students enrolled in this course
            students_enrolled = [e["student_id"] for e in data["enrollments"] if e["course_id"] == course_id]
            
            # Intersection
            students_in_session = list(set(students_in_class) & set(students_enrolled))
            
            if not students_in_session:
                continue
                
            for i in range(random.randint(5, 12)):
                sid = str(uuid.uuid4())
                status = 'finished' if i < 4 or random.random() > 0.3 else random.choice(['active', 'incoming'])
                
                cur.execute(
                    "INSERT INTO sessions (id, instructor_id, class_id, course_id, status) VALUES (%s, %s, %s, %s, %s)",
                    (sid, assignment["instructor_id"], class_id, course_id, status)
                )
                
                # 2. Generate Attendance Records for finished sessions
                if status == 'finished':
                    for student_id in students_in_session:
                        rid = str(uuid.uuid4())
                        rand = random.random()
                        # 80% present, 10% late, 10% absent
                        att_status = 'present' if rand < 0.8 else 'late' if rand < 0.9 else 'absent'
                        
                        cur.execute(
                            "INSERT INTO attendance_record (id, student_id, session_id, status) VALUES (%s, %s, %s, %s)",
                            (rid, student_id, sid, att_status)
                        )
                        
                        # 3. Generate some Permissions for absent students
                        if att_status == 'absent' and random.random() < 0.4:
                            pid = str(uuid.uuid4())
                            p_status = random.choice(['pending', 'accepted', 'rejected'])
                            desc = fake.sentence(nb_words=10)
                            img_url = f"https://picsum.photos/seed/{pid}/400/600"
                            
                            cur.execute(
                                "INSERT INTO permissions (id, session_id, student_id, description, img_url, status) VALUES (%s, %s, %s, %s, %s, %s)",
                                (pid, sid, student_id, desc, img_url, p_status)
                            )

        conn.commit()
        print("--- Seeding Complete Successfully ---")
        
    except Exception as e:
        print(f"Error during seeding: {e}")
        conn.rollback()
    finally:
        cur.close()

def main():
    print(f"Connecting to Data Source: {DATA_SOURCE_URL}")
    ds_conn = get_conn(DATA_SOURCE_URL)
    if not ds_conn:
        return
    
    print("Fetching data from Data Source...")
    data = fetch_data(ds_conn)
    ds_conn.close()
    
    print(f"Connecting to Attendance System: {ATT_SYSTEM_URL}")
    att_conn = get_conn(ATT_SYSTEM_URL)
    if not att_conn:
        return
    
    push_data(att_conn, data)
    att_conn.close()

if __name__ == "__main__":
    main()
