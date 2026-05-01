# Smart Campus Attendance Management System

A comprehensive web-based attendance tracking system for educational institutions, featuring separate Admin and Student dashboards with real-time data synchronization.

## 🎯 Overview

This system provides a complete solution for managing student attendance with:
- **Admin Dashboard**: Session management, analytics, reporting, and permission handling
- **Student Dashboard**: Personal attendance history, schedule viewing, and permission requests
- **Real-time Updates**: Live attendance tracking and instant notifications
- **JWT Authentication**: Secure token-based authentication system
- **RESTful API**: Clean API architecture with proper error handling

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Port 3001)                       │
│              Admin Dashboard | Student Dashboard            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Attendance System Backend (Port 3001)           │
│                    (Rust + Axum + JWT)                      │
│  • Serves React UI (Admin + Student)                        │
│  • JWT token generation & validation                        │
│  • Session & attendance management                          │
│  • Permission request handling                              │
│  • Proxies authentication to School API                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           School Management API (Port 3000)                  │
│              (Rust + Diesel + Async)                        │
│  • User authentication                                       │
│  • User profile management                                   │
│  • Course & class management                                │
│  • Student & instructor data                                │
│  • Enrollment & assignment tracking                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│  • profiles (users with credentials)                        │
│  • students (student details + NFC IDs)                     │
│  • instructors (instructor details)                         │
│  • courses (course catalog)                                 │
│  • classes (year/section groups)                            │
│  • enrollments (student-course registration)                │
│  • assignments (instructor-class-course)                    │
│  • sessions (class sessions)                                │
│  • attendance_record (attendance tracking)                  │
│  • permissions (permission requests)                        │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Features

### Educator / Instructor Portal
- **Dashboard Overview**: Quick glance at active sessions, course counts, and attendance averages
- **Course Management**: Detailed view of assigned courses with student counts and credit information
- **Real-time Attendance**: Start new class sessions and mark attendance manually or via NFC
- **Class Roster Tracking**: View student lists for each session with live present/absent counts
- **Interactive Schedule**: Weekly teaching schedule with grid and list views for room assignments
- **Permission Approval**: Review and approve/reject student document-based absence requests
- **Profile & Preferences**: Manage personal instructor profiles and notification settings

### Student Dashboard
- **Attendance History**: View personal attendance records by course
- **Class Schedule**: Check upcoming classes and sessions
- **Permission Requests**: Submit absence/late arrival requests with file attachments
- **Notifications**: Receive updates about attendance and permissions
- **Profile Management**: View and update personal information
- **Course Details**: Access course-specific attendance information

## 🚀 Quick Start

### Prerequisites

- **PostgreSQL** (v12 or higher)
- **Rust** (latest stable version) - [Install from rustup.rs](https://rustup.rs)
- **Node.js** (v18 or higher) - For building the UI
- **Git** - For version control

### Installation

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd att_system
   ```

2. **Setup Database**
   
   Create the PostgreSQL database:
   ```bash
   psql -U postgres
   CREATE DATABASE as;
   \q
   ```

   Configure environment variables:
   ```bash
   # In att_system/.env
   DATABASE_URL=postgresql://username:password@localhost:5432/as
   
   # In DATA_SOURCE/.env
   DATABASE_URL=postgresql://username:password@localhost:5432/as
   ```

3. **Build the Frontend**
   ```bash
   cd ui
   npm install
   npm run build
   cd ..
   ```

### Running the System

You need **TWO terminal windows**:

**Terminal 1 - School Management API (Port 3000):**
```bash
cd DATA_SOURCE
cargo run
```
Wait for: `Listening on port 3000`

**Terminal 2 - Attendance System (Port 3001):**
```bash
cargo run
```
Wait for: `Listening on port 3001`

**Access the Application:**
```
http://localhost:3001
```

## 🔐 Default Login Credentials

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Access**: Full administrative privileges

### Instructor Account
- **Username**: `dr.mekaeel`
- **Password**: `admin123`
- **Access**: Session management, attendance tracking

### Student Accounts
All students use password: `password123`

| Username | Name | Class |
|----------|------|-------|
| `alice.j` | Alice Johnson | Year 1, Section 1 |
| `bob.s` | Bob Smith | Year 1, Section 1 |
| `charlie.b` | Charlie Brown | Year 1, Section 1 |
| `diana.p` | Diana Prince | Year 1, Section 1 |

## 📊 Database Schema

### Core Tables

**profiles** - User accounts
- `id` (UUID, PK)
- `first_name`, `last_name`, `username`
- `password_hash` (plain text for development)
- `role` (admin/instructor/student)
- `img_url` (optional profile picture)

**students** - Student details
- `id` (UUID, PK, FK to profiles)
- `class_id` (FK to classes)
- `nfc_id` (unique NFC card identifier)

**instructors** - Instructor details
- `id` (UUID, PK, FK to profiles)

**courses** - Course catalog
- `id` (UUID, PK)
- `course_id` (e.g., CS101)
- `name` (course name)

**classes** - Year/Section groups
- `id` (UUID, PK)
- `year` (integer)
- `section` (integer)

**enrollments** - Student-course registration
- `id` (UUID, PK)
- `student_id` (FK to students)
- `course_id` (FK to courses)

**assignments** - Instructor teaching assignments
- `id` (UUID, PK)
- `instructor_id` (FK to instructors)
- `class_id` (FK to classes)
- `course_id` (FK to courses)

**sessions** - Class sessions
- `id` (UUID, PK)
- `instructor_id` (FK to instructors)
- `class_id` (FK to classes)
- `course_id` (FK to courses)
- `status` (active/completed/cancelled)

**attendance_record** - Attendance tracking
- `id` (UUID, PK)
- `student_id` (FK to students)
- `session_id` (FK to sessions)
- `status` (present/absent/late)

**permissions** - Permission requests
- `id` (UUID, PK)
- `session_id` (FK to sessions)
- `student_id` (FK to students)
- `description` (reason for absence)
- `img_url` (optional supporting document)
- `status` (pending/accepted/rejected)

## 🛠️ Technology Stack

### Backend
- **Language**: Rust
- **Web Framework**: Axum (async web framework)
- **ORM**: Diesel (with async support via diesel-async)
- **Database**: PostgreSQL
- **Authentication**: JWT (jwt-simple)
- **Connection Pooling**: bb8

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4 + Custom CSS
- **Routing**: React Router v6
- **State Management**: React Context API
- **HTTP Client**: Fetch API

### Development Tools
- **Package Manager**: npm (frontend), Cargo (backend)
- **Database Migrations**: Diesel CLI
- **Environment Variables**: dotenvy

## 📁 Project Structure

```
att_system/
├── src/                          # Attendance system backend
│   ├── handlers/
│   │   ├── mod.rs               # Login, refresh, static files
│   │   ├── instructors.rs       # Instructor endpoints
│   │   └── students.rs          # Student endpoints
│   ├── main.rs                  # Application entry point
│   ├── models.rs                # Database models
│   ├── schema.rs                # Database schema
│   ├── types.rs                 # Type definitions
│   ├── router.rs                # Route configuration
│   └── helpers.rs               # Helper functions
│
├── ui/                          # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx  # Entry point
│   │   │   ├── admin/           # Admin dashboard pages
│   │   │   └── student/         # Student dashboard pages
│   │   ├── components/          # Reusable components
│   │   ├── lib/                 # Utilities and types
│   │   ├── hooks/               # Custom React hooks
│   │   ├── App.tsx              # Main app component
│   │   ├── api.ts               # API client
│   │   └── AuthContext.tsx      # Authentication context
│   ├── dist/                    # Built frontend
│   └── package.json             # Frontend dependencies
│
├── DATA_SOURCE/                 # School Management API
│   ├── src/
│   │   ├── main.rs              # API entry point
│   │   ├── models.rs            # Data models
│   │   └── schema.rs            # Database schema
│   └── .env                     # Database configuration
│
├── migrations/                  # Database migrations
├── .env                         # Environment configuration
├── Cargo.toml                   # Rust dependencies
└── README.md                    # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /login` - User login (returns JWT tokens)
- `POST /refresh` - Refresh access token

### User Management
- `GET /profile` - Get current user profile
- `GET /user/{user_id}` - Get user by ID
- `GET /student/profile` - Get student profile by ID/NFC

### Sessions
- `GET /session` - List all sessions
- `GET /sessions/instructor` - List instructor's sessions
- `GET /sessions/student` - List student's attendance
- `POST /session/create` - Create new session
- `PATCH /session/update` - Update session status

### Attendance
- `GET /record/{session_id}` - Get attendance records for session
- `POST /record/create` - Initialize attendance records
- `PATCH /record/update` - Mark attendance (by NFC)

### Permissions
- `GET /student/permissions` - List student's permissions
- `POST /student/permissions` - Submit permission request
- `GET /instructor/permissions/{session_id}` - List session permissions
- `PATCH /instructor/permissions/update/{id}` - Update permission status

### Academic Data
- `GET /course/{course_id}` - Get course details
- `GET /class/{class_id}` - Get class details
- `GET /student/courses/{student_id}` - Get student's courses
- `GET /instructor/assignment/{instructor_id}` - Get instructor assignments

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Database Connection Error
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check DATABASE_URL in `.env` files
- Ensure database exists: `psql -U postgres -l`

### Login Fails
- Ensure both APIs are running (ports 3000 and 3001)
- Check DATA_SOURCE/.env has correct database URL
- Verify users exist in database

### 500 Errors in Console
- Normal for fresh installation (no attendance records yet)
- Create sessions and take attendance to populate data
- Errors are caught gracefully and don't affect functionality

### UI Not Loading
```bash
cd ui
npm run build
cd ..
cargo run
```

## 📝 Development Notes

### Security Considerations
⚠️ **Important**: This system currently uses plain text passwords for development. For production:
- Implement password hashing (bcrypt, argon2)
- Use HTTPS for all connections
- Implement rate limiting
- Add CSRF protection
- Enable secure cookie flags

### Adding New Users
```sql
INSERT INTO profiles (id, first_name, last_name, username, password_hash, role)
VALUES (gen_random_uuid(), 'John', 'Doe', 'john.doe', 'password123', 'student');
```

### Creating Test Data
1. Login as admin/instructor
2. Navigate to Sessions page
3. Create new sessions
4. Take attendance
5. Dashboard will populate with real data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

[Add your license information here]

## 👥 Authors

[Add author information here]

## 🙏 Acknowledgments

- Built with Rust and React
- Uses Axum web framework
- Diesel ORM for database operations
- Tailwind CSS for styling

---

**Need Help?** Check the troubleshooting section or create an issue in the repository.
