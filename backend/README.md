# Frontend Developer Guide for CBL Request Approver

Welcome! This guide will help you set up your frontend and connect it to the backend services. Follow these steps even if you are new to web development.

---

## 1. Environment Setup (`.env` file) and MySQL Database Requirement

Before running the backend server, you **must** set up a `.env` file and have access to a live MySQL database.

### Where to put the `.env` file

- Place the `.env` file in the `backend` folder (same location as `server.js`).

### What to put in the `.env` file

Add the following variables and fill in your values:

```
# MySQL Database
MYSQL_HOST=your-mysql-host
MYSQL_USER=your-mysql-username
MYSQL_PASSWORD=your-mysql-password
MYSQL_DB_NAME=CBLRequestApproverDB

# Azure AD Authentication
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_REDIRECT_URI=http://localhost:5000/auth/callback

# Session Secret
SESSION_SECRET=your-session-secret

# SMTP (for email notifications)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM="CBL Request Approver <no-reply@cbl.com>"

# Website URL
WEBSITE_URL=http://localhost:5000
```

> **Note:**  
> - You must have a live MySQL server running and accessible with the credentials above.
> - The backend will automatically create the required database and tables if they do not exist.
> - Azure AD credentials are required for authentication.
> - SMTP settings are needed for email notifications.

---

## 2. Where to Put Your Frontend Files

- Place all your HTML, CSS, and JavaScript files in the `public` folder:
  ```
  backend/
    public/
      index.html
      style.css
      app.js
      images/
  ```
- The main file should be `index.html`.  
- Any images, scripts, or stylesheets should also go inside `public`.

---

## 3. How to Start the Backend Server

1. Make sure you have Node.js installed.
2. Open a terminal in the `backend` folder.
3. Run:
   ```sh
   npm install
   npm run dev
   ```
4. The backend will run at:  
   `http://localhost:5000/`

---

## 4. How to Access Your Frontend

- Open your browser and go to:  
  `http://localhost:5000/`
- The backend will automatically serve the files from the `public` folder.

---

## 5. Backend API Routes

### Authentication

#### **Login**
- **Route:** `/auth/login`
- **Method:** GET
- **Description:** Redirects the user to Microsoft login.
- **How to use:**  
  Redirect the user to this URL to start the login process.
  ```js
  window.location.href = '/auth/login';
  ```

#### **Callback**
- **Route:** `/auth/callback`
- **Method:** GET
- **Description:** Called by Microsoft after login.  
- **How to use:**  
  Handled automatically by the backend. You do not need to call this from the frontend.

#### **Logout**
- **Route:** `/auth/logout`
- **Method:** GET
- **Description:** Logs out the current user and destroys the session.
- **How to use:**  
  Redirect the user to this URL to log out.
  ```js
  window.location.href = '/auth/logout';
  ```

---

### User Info

#### **Get Current User**
- **Route:** `/api/user/me`
- **Method:** GET
- **Description:** Returns the currently authenticated user's profile or `null` if not logged in.
- **Example Response:**
  ```json
  {
    "user": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "isAdmin": false
    }
  }
  ```
- **How to use:**
  ```js
  fetch('/api/user/me')
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        // User is logged in
      } else {
        // User is not logged in
      }
    });
  ```

---

### Requests

#### **Create a Request**
- **Route:** `/api/requests/create`
- **Method:** POST
- **Description:** Creates a new request (outward or inward).
- **Body Example:**
  ```json
  {
    "requestType": "outward",
    "outwardData": {
      "recipient_name": "Jane Smith",
      "date": "2025-08-01",
      "purpose": "Sample",
      "serial_no": "12345",
      "account_code": "AC001",
      "description": "Sample description",
      "unit": "kg",
      "quantity": 10,
      "department": "Sales",
      "priority": "High",
      "comment": "Urgent",
      "attachment_path": "/uploads/file.pdf",
      "to_be_returned": true
    }
  }
  ```
- **How to use:**
  ```js
  fetch('/api/requests/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... })
  })
  .then(res => res.json())
  .then(data => { /* handle response */ });
  ```

#### **Get My Requests**
- **Route:** `/api/requests/my-requests`
- **Method:** GET
- **Description:** Returns all requests created by the logged-in user.
- **How to use:**
  ```js
  fetch('/api/requests/my-requests')
    .then(res => res.json())
    .then(data => { /* handle response */ });
  ```

#### **Get Request Details**
- **Route:** `/api/requests/:id`
- **Method:** GET
- **Description:** Returns details for a specific request by ID.
- **How to use:**
  ```js
  fetch('/api/requests/123')
    .then(res => res.json())
    .then(data => { /* handle response */ });
  ```

#### **Get My Requests Count**
- **Route:** `/api/requests/my-requests-count`
- **Method:** GET
- **Description:** Returns a summary of your requests (total, approved, pending, rejected).
- **How to use:**
  ```js
  fetch('/api/requests/my-requests-count')
    .then(res => res.json())
    .then(data => { /* handle response */ });
  ```

#### **Get Pending Approvals**
- **Route:** `/api/requests/pending-approvals`
- **Method:** GET
- **Description:** Returns requests that need your approval.
- **How to use:**
  ```js
  fetch('/api/requests/pending-approvals')
    .then(res => res.json())
    .then(data => { /* handle response */ });
  ```

#### **Approve/Reject a Request**
- **Route:** `/api/requests/:id/decision`
- **Method:** POST
- **Description:** Approve or reject a request.
- **Body Example:**
  ```json
  {
    "decision": "Approved",
    "comments": "Looks good"
  }
  ```
- **How to use:**
  ```js
  fetch('/api/requests/123/decision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'Approved', comments: 'OK' })
  })
  .then(res => res.json())
  .then(data => { /* handle response */ });
  ```

#### **Upload a File**
- **Route:** `/api/requests/upload`
- **Method:** POST (multipart/form-data)
- **Description:** Uploads a file to the server.
- **How to use:**
  ```js
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  fetch('/api/requests/upload', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => { /* handle response */ });
  ```

---

## 6. Example: Show User Info and Login/Logout

```html
<div id="user-info">Loading...</div>
<script>
  async function fetchUser() {
    const res = await fetch('/api/user/me');
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        document.getElementById('user-info').innerHTML = `
          <p>Welcome, <b>${data.user.name || data.user.email}</b>!</p>
          <a href="/auth/logout">Logout</a>
        `;
      } else {
        document.getElementById('user-info').innerHTML = `
          <a href="/auth/login">Login with Microsoft</a>
        `;
      }
    }
  }
  fetchUser();
</script>
```

---

## 7. Notes

- All authentication is handled by Microsoft Azure AD.
- User sessions are managed automatically by the backend.
- You do **not** need to handle authentication tokens manually.
- The backend uses MySQL to store user and request data.

---

## 8. Need Help?

If you have any questions or issues, contact the backend developer for