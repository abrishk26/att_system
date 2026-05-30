import os
import uuid
import random
import psycopg2
from faker import Faker
from dotenv import dotenv_values
from datetime import datetime, timedelta

fake = Faker()

def get_db_urls():
    att_env = dotenv_values(os.path.join(os.path.dirname(__file__), "../.env"))
    ds_env = dotenv_values(os.path.join(os.path.dirname(__file__), "../../data_source/.env"))
    
    return att_env.get("DATABASE_URL"), ds_env.get("DATABASE_URL")

def seed_att_system():
    att_url, ds_url = get_db_urls()
    
    if not att_url or not ds_url:
        print("Could not find database URLs.")
        return

    print("Connecting to databases...")
    try:
        att_conn = psycopg2.connect(att_url)
        ds_conn = psycopg2.connect(ds_url)
    except Exception as e:
        print(f"Error connecting to databases: {e}")
        return

    att_cur = att_conn.cursor()
    ds_cur = ds_conn.cursor()

    try:
        print("--- Starting att_system Database Seeding ---")

        print("Clearing existing att_system data...")
        tables = [
            "attendance_record", "sessions", "permissions", 
            "notifications", "tap_log", "token_denylist"
        ]
        att_cur.execute(f"TRUNCATE {', '.join(tables)} CASCADE")

        print("Fetching related data from data_source...")
        # Get assignments to create sessions
        ds_cur.execute("SELECT instructor_id, class_id, course_id FROM assignments")
        assignments = ds_cur.fetchall()
        
        # Get enrollments to know who is in what course
        ds_cur.execute("SELECT student_id, course_id FROM enrollments")
        enrollments = ds_cur.fetchall()
        
        # Get students to know their class_id and nfc_id
        ds_cur.execute("SELECT id, class_id, nfc_id FROM students")
        students = ds_cur.fetchall()

        if not assignments or not enrollments or not students:
            print("Error: data_source database lacks necessary data. Please run seed_data.py on data_source first.")
            return

        # Map student class and course enrollment
        student_course_map = {} # (student_id, course_id)
        for student_id, course_id in enrollments:
            student_course_map[(student_id, course_id)] = True

        student_class_map = {row[0]: row[1] for row in students}
        student_nfc_map = {row[0]: row[2] for row in students}
        
        print("Seeding sessions and attendance...")
        for inst_id, class_id, course_id in assignments:
            # Find students in this class enrolled in this course
            students_in_session = [
                s_id for s_id in student_class_map
                if student_class_map[s_id] == class_id and (s_id, course_id) in student_course_map
            ]

            if not students_in_session: 
                continue

            for i in range(random.randint(5, 10)):
                session_id = str(uuid.uuid4())
                status = 'finished' if i < 4 or random.random() > 0.3 else random.choice(['active', 'incoming'])
                created_at = datetime.now() - timedelta(days=random.randint(1, 30))
                
                att_cur.execute(
                    "INSERT INTO sessions (id, instructor_id, class_id, course_id, status, created_at) VALUES (%s, %s, %s, %s, %s, %s)", 
                    (session_id, inst_id, class_id, course_id, status, created_at)
                )

                if status == 'finished':
                    for sid in students_in_session:
                        rand = random.random()
                        att_status = 'present' if rand < 0.8 else 'late' if rand < 0.9 else 'absent'
                        att_cur.execute(
                            "INSERT INTO attendance_record (id, student_id, session_id, status) VALUES (%s, %s, %s, %s)", 
                            (str(uuid.uuid4()), sid, session_id, att_status)
                        )
                        
                        # Generate some tap logs for present/late students
                        if att_status in ['present', 'late'] and random.random() > 0.1:
                            tapped_at = created_at + timedelta(minutes=random.randint(-5, 15))
                            att_cur.execute(
                                "INSERT INTO tap_log (id, nfc_id, session_id, student_id, success, tapped_at) VALUES (%s, %s, %s, %s, %s, %s)",
                                (str(uuid.uuid4()), student_nfc_map[sid], session_id, sid, True, tapped_at)
                            )
                
                elif status == 'active':
                    # Only some students have tapped so far
                    for sid in students_in_session:
                        if random.random() > 0.5:
                            att_status = 'present'
                            att_cur.execute(
                                "INSERT INTO attendance_record (id, student_id, session_id, status) VALUES (%s, %s, %s, %s)", 
                                (str(uuid.uuid4()), sid, session_id, att_status)
                            )
                            tapped_at = created_at + timedelta(minutes=random.randint(0, 10))
                            att_cur.execute(
                                "INSERT INTO tap_log (id, nfc_id, session_id, student_id, success, tapped_at) VALUES (%s, %s, %s, %s, %s, %s)",
                                (str(uuid.uuid4()), student_nfc_map[sid], session_id, sid, True, tapped_at)
                            )

        print("--- att_system Seeding Complete Successfully ---")
        att_conn.commit()

    except Exception as e:
        print(f"Error during seeding: {e}")
        att_conn.rollback()
    finally:
        att_cur.close()
        att_conn.close()
        ds_cur.close()
        ds_conn.close()

if __name__ == "__main__":
    seed_att_system()
