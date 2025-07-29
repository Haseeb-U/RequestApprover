# Backend API Documentation

This backend provides authentication and user management using Microsoft Azure AD and MySQL. Below are the available routes and instructions for frontend developers.

## Base URL

```
http://localhost:5000/
```

## Authentication Routes

### 1. Login with Microsoft

- **GET** `/auth/login`
- Redirects the user to Microsoft login.  
- **Usage:**  
  Direct the user to this URL to start the login process.

### 2. Microsoft Callback

- **GET** `/auth/callback`
- This route is called by Microsoft after login.  
- **Usage:**  
  Handled automatically by the backend. No need to call directly from frontend.

### 3. Logout

- **GET** `/auth/logout`
- Logs out the current user and destroys the session.
- **Usage:**  
  Call this endpoint to log the user out.

---

## User Routes

### 1. Get Current User

- **GET** `/api/user/me`
- Returns the currently authenticated user's profile or `null` if not logged in.
- **Response Example:**
  ```json
  {
    "user": {
      "displayName": "John Doe",
      "email": "john.doe@example.com",
      ...
    }
  }
  ```
- **Usage:**  
  Fetch this endpoint to check if the user is logged in and get their info.

---

## Static Files

- The backend serves static files from `/public`.  
- The main frontend file is available at `/`.

---

## Example Usage

```js
// Check if user is logged in
fetch('/api/user/me')
  .then(res => res.json())
  .then(data => {
    if (data.user) {
      // User is logged in
    } else {
      // User is not logged in
    }
  });

// To log in, redirect to:
window.location.href = '/auth/login';

// To log out, redirect to:
window.location.href = '/auth/logout';
```

---

## Notes

- All authentication is handled via Microsoft Azure AD.
- User sessions are managed with cookies (via express-session).
- The backend uses MySQL to store user info.

---

For any questions or issues, contact the