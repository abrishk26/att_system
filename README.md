# Att System API

This project provides an attendance management system with endpoints for user authentication, session management, and attendance record tracking.

## Getting Started

The server runs on port `3001` by default.

```bash
# To start the server
cargo run
```

## API Documentation

### Authentication

Modern JWT-based authentication is used. The `/login` endpoint provides an `access_token` and a `refresh_token`.

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

### Sessions

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
  ```json
  {
    "id": "UUID",
    "instructor_id": "UUID",
    "class_id": "UUID",
    "course_id": "UUID",
    "status": "incoming"
  }
  ```

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
- **Success Response**: `200 OK`
  ```json
  {
    "id": "UUID",
    "instructor_id": "UUID",
    "class_id": "UUID",
    "course_id": "UUID",
    "status": "string"
  }
  ```

#### List All Sessions
- **URL**: `/session`
- **Method**: `GET`
- **Success Response**: `200 OK`
  ```json
  [
    {
      "id": "UUID",
      "instructor_id": "UUID",
      "class_id": "UUID",
      "course_id": "UUID",
      "status": "string"
    }
  ]
  ```

---

### Attendance Records

#### Create Records for Session
Initializes attendance records for all students in the class associated with the session.
- **URL**: `/record/create`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "session_id": "UUID"
  }
  ```
- **Success Response**: `201 Created`
  ```json
  [
    {
      "id": "UUID",
      "student_id": "UUID",
      "session_id": "UUID",
      "status": "absent"
    }
  ]
  ```

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
- **Success Response**: `200 OK`
  ```json
  {
    "id": "UUID",
    "student_id": "UUID",
    "session_id": "UUID",
    "status": "string"
  }
  ```

#### Get Records for Session
- **URL**: `/record/:session_id`
- **Method**: `GET`
- **Path Parameters**: `session_id` (UUID)
- **Success Response**: `200 OK`
  ```json
  [
    {
      "id": "UUID",
      "student_id": "UUID",
      "session_id": "UUID",
      "status": "string"
    }
  ]
  ```

---

### Error Responses
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
