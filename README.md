# Att System API

This project provides an attendance management system with endpoints for user authentication, session management, and attendance record tracking.

## Getting Started

The server runs on port `3001` by default.

```bash
# To start the server
cargo run
```

## API Documentation

### 🔐 Authentication

Modern JWT-based authentication is used. The `/login` endpoint provides an `access_token` and a `refresh_token`.

Most protected routes require the `Authorization: Bearer <access_token>` header.

#### Login
- **URL**: `/login`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "access_token": "string",
    "refresh_token": "string"
  }
  ```
- **Error Response**: `401 Unauthorized` (Invalid credentials) or `500 Internal Server Error`

#### Refresh Token
- **URL**: `/refresh`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "refresh_token": "string"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "access_token": "string",
    "refresh_token": "string"
  }
  ```

---

### 👤 User Profile & Data

#### Get Profile
- **URL**: `/profile`
- **Method**: `GET`
- **Success Response**: `200 OK`
  ```json
  {
    "id": "string",
    "username": "string",
    "first_name": "string",
    "last_name": "string",
    "role": "string",
    "img_url": "string"
  }
  ```

#### Get Instructor Assignments
- **URL**: `/instructor/assignments`
- **Method**: `GET`
- **Success Response**: `200 OK`
  ```json
  [
    {
      "id": "UUID",
      "instructor_id": "UUID",
      "class_id": "UUID",
      "course_id": "UUID"
    }
  ]
  ```

#### Get Student Courses
- **URL**: `/student/courses`
- **Method**: `GET`
- **Success Response**: `200 OK`
  ```json
  [
    {
      "id": "UUID",
      "course_id": "string",
      "name": "string"
    }
  ]
  ```

#### Get Course Details
- **URL**: `/course/:course_id`
- **Method**: `GET`
- **Success Response**: `200 OK`

#### Get Class Details
- **URL**: `/class/:class_id`
- **Method**: `GET`
- **Success Response**: `200 OK`

---

### 📅 Sessions

#### Create Session
- **URL**: `/session/create`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "instructor_id": "UUID",
    "class_id": "UUID",
    "course_id": "UUID"
  }
  ```
- **Success Response**: `201 Created`

#### Update Session Status
- **URL**: `/session/update`
- **Method**: `PATCH`
- **Request Body**:
  ```json
  {
    "session_id": "UUID",
    "status": "string"
  }
  ```

#### List All Sessions
- **URL**: `/session`
- **Method**: `GET`

#### List My Instructor Sessions
- **URL**: `/sessions/instructor`
- **Method**: `GET`
Returns sessions belonging to the logged-in instructor.

#### List My Student Attendance
- **URL**: `/sessions/student`
- **Method**: `GET`
Returns attendance records belonging to the logged-in student.

---

### ✅ Attendance Records

#### Create Records for Session
Initializes attendance records for all students in the class associated with the session.
- **URL**: `/record/create`
- **Method**: `POST`

#### Update Attendance (Mark Attendance)
Marks a student's attendance using their NFC ID.
- **URL**: `/record/update`
- **Method**: `PATCH`
- **Request Body**:
  ```json
  {
    "nfc_id": "string",
    "session_id": "UUID",
    "status": "string"
  }
  ```

#### Get Enriched Records for Session
Returns records with associated student names and details.
- **URL**: `/record/:session_id`
- **Method**: `GET`
- **Success Response**: `200 OK`
  ```json
  [
    {
      "id": "UUID",
      "student_id": "UUID",
      "session_id": "UUID",
      "status": "string",
      "student_name": "string",
      "nfc_id": "string"
    }
  ]
  ```

---

### 🛡 Permissions Management

#### (Student) Submit Permission
Submits a new permission request with an optional file upload.
- **URL**: `/student/permissions`
- **Method**: `POST`
- **Body**: `multipart/form-data`
    - `session_id`: UUID
    - `description`: String
    - `file`: File (optional)

#### (Student) List My Permissions
- **URL**: `/student/permissions`
- **Method**: `GET`

#### (Instructor) List Session Permissions
Returns all permissions submitted for a specific session.
- **URL**: `/instructor/permissions/:session_id`
- **Method**: `GET`

#### (Instructor) Update Permission Status
Updates the status of a permission.
- **URL**: `/instructor/permissions/update/:id`
- **Method**: `PATCH`
- **Request Body**:
  ```json
  {
    "status": "accepted" | "rejected" | "pending"
  }
  ```

---

### ❌ Error Responses
All endpoints may return an error response in the following format:
```json
{
  "message": "error description"
}
```
Common status codes:
- `400 Bad Request`: Invalid request format.
- `401 Unauthorized`: Invalid or expired tokens.
- `500 Internal Server Error`: Server-side failure.
