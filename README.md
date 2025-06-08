# EduPortal
**EduPortal** is a web-based Student and Teacher Performance Monitoring System. It supports authentication, role-based dashboards, and basic performance monitoring functions.

Students can:
* View their grades, attendance, and feedback.

Teachers can:
* View student grades
* Add/edit grades
* Track attendance

# Tools and Technologies Used
| Tool/Platform              | Purpose                                                                     |
| -------------------------- | --------------------------------------------------------------------------- |
| **Replit**                 | Development environment with built-in backend (Python) and frontend hosting |
| **Firebase**               | Backend-as-a-Service (Authentication + Realtime DB)                         |
| **GitHub**                 | Version control and collaboration                                           |
| **HTML/CSS/JS**            | Frontend design and logic                                                   |
| **Python (Flask/uvicorn)** | Optional backend utilities or Replit template requirements                  |

# File Structure and Purpose
EduPortal/
├── .replit                # Replit environment configuration
├── LICENSE                # Open-source license file
├── README.md              # Project overview and setup instructions
├── app.py                 # (Optional) Python backend (Flask or similar)
├── main.py                # (Optional) Main Python entry point
├── pyproject.toml         # Python project dependencies
├── uv.lock                # Replit dependency lock file
│
├── index.html             # Main HTML file (Login + Dashboard)
├── style.css              # Modern CSS theme
├── script.js              # Main JavaScript logic
└── firebase-config.js     # Firebase config (legacy version)

# Firebase Integration
Firebase was used for:

* Authentication: Users sign in using their email and password.
* Realtime Database: Stores and retrieves grades, attendance, and feedback.

Configuration was initialized in firebase-config.js, and functionality handled via script.js.

# Development Process
**Phase 1: Planning**
* Defined features based on user roles (Student / Teacher).
* Chose Replit for rapid development, Firebase for backend.

**Phase 2: Development (on Replit)**
* Created core files: index.html, style.css, script.js, and firebase-config.js.
* Designed a responsive, accounting-style UI for dashboards.
* Implemented role-based logic in JavaScript.
* Used Firebase to authenticate and fetch/store data dynamically.

**Phase 3: Version Control & Migration**
* After development, files were uploaded to GitHub for version control.
* .git was not originally initialized in Replit; files were added manually to a GitHub repository using VS Code.

**Phase 4: Testing (Replit)**
* Project was tested by importing in the github repository in Replit.
* Debugged Firebase paths and dashboard rendering issues.

# Functional Pages
| Page                             | Description                                                         |
| -------------------------------- | ------------------------------------------------------------------- |
| **Login Section** (`index.html`) | Role selection + email/password login                               |
| **Student Dashboard**            | Displays grades, attendance, feedback (read-only)                   |
| **Teacher Dashboard**            | Displays student records; allows grade/attendance input and editing |
