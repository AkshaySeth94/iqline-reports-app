# PRD: LabDash Patient Report Portal

## 0. Document Purpose
This Product Requirements Document (PRD) specifies the vision, features, and requirements for the initial version (v1) of the LabDash Patient Report Portal. It is intended for the engineering, design, and quality assurance teams to understand what we are building, for whom, and why. It serves as the single source of truth for the project's scope and goals.

## 1. Vision
The current process of receiving and tracking lab results is often slow and fragmented for patients, relying on paper copies, phone calls, or generic web portals. This creates a disconnect between patients and their own health data. For diagnostic labs, manual data entry and report distribution are time-consuming and prone to error.

LabDash will bridge this gap by providing patients with instant, mobile-first access to their key health metrics, presented in a clear, trend-focused dashboard. For lab administrators, it offers a streamlined, digital-native workflow for entering and managing patient reports. By empowering patients to take a more active role in their health management and freeing up lab staff to focus on their core work, LabDash aims to make health data more accessible, understandable, and actionable.

## 2. Target User
### 2.1 Primary Persona
*   **Patient (Priya)**: Priya is a 45-year-old marketing manager recently diagnosed with pre-diabetes. Her doctor has advised her to monitor her glucose levels closely. She uses her smartphone for everything from banking to ordering groceries. She wants a simple way to see her lab results on her phone as soon as they are ready and to visualize her progress over time without having to manage paper files or complex spreadsheets.

*   **Admin (Anand)**: Anand is a lab technician at a local diagnostic clinic. He is responsible for processing samples and entering results. The current process involves manual data entry into a desktop application and then printing or emailing reports. He needs a fast, straightforward tool to enter results for patients, select the correct patient, and make the report available to them digitally, minimizing the risk of data entry errors and administrative overhead.

### 2.2 Jobs To Be Done
*   **Patient**:
    *   *Functional*: When I get a lab test done, let me see my results on my phone quickly.
    *   *Functional*: Show me my historical glucose values in a simple chart so I can see my trends.
    *   *Emotional*: Help me feel in control of my health data and more engaged in managing my condition.
*   **Admin**:
    *   *Functional*: Give me a simple form to enter the results for a specific patient's Glucose Marker Report.
    *   *Functional*: Let me find a patient quickly to create or edit a report for them.
    *   *Emotional*: Reduce the stress of manual data entry and the fear of making a mistake that affects a patient's record.

## 3. Glossary
*   **Admin**: A privileged user of the Admin Panel who can manage Patients and their Reports.
*   **Admin Panel**: A secure web interface for Admins to perform their management tasks.
*   **Glucose Marker Report**: A specific type of Report containing a patient's glucose value, report date, status, and optional notes.
*   **OTP (One-Time Password)**: A temporary code used by a Patient to log in. For v1, this is a static, predefined value.
*   **Patient**: An end-user of the mobile web app who views their own lab reports. Identified by a unique phone number.
*   **Patient Dashboard**: The main screen for a logged-in Patient, displaying their list of Reports and a chart of historical glucose values.
*   **Report**: A digital record of a lab test result. For v1, this is exclusively a Glucose Marker Report.

## 4. Features

### 4.1 Patient Authentication
**Description:** Patients access the application using their registered phone number. They will be prompted to enter an OTP to log in. For v1, there is no SMS gateway; a static OTP will be used for all logins. The system will create a secure session for the Patient upon successful authentication. [ASSUMPTION: A static OTP is a sufficient security measure for the initial MVP launch, to be replaced by a dynamic, SMS-based OTP in a future version.]

**Functional Requirements:**

#### FR-1: Patient Login with Phone and OTP
A Patient can log in to the application by providing their registered phone number and a valid OTP.

**Consequences (testable):**
- Given a registered Patient's phone number, the system prompts for an OTP.
- Upon entering the correct static OTP, which is `123456`, the system grants access and redirects the Patient to their Patient Dashboard.
- Upon entering an incorrect OTP, the system displays an error message "Invalid OTP" and denies access.
- An attempt to log in with an unregistered phone number results in an error message "Phone number not found".

#### FR-2: Secure Patient Session
The system shall establish a secure, authenticated session for a Patient after a successful login.

**Consequences (testable):**
- The Patient remains logged in as they navigate the application.
- The session token is securely stored on the client and transmitted via headers for authenticated requests.
- The session expires after 24 hours of inactivity, requiring the Patient to log in again.

### 4.2 Patient Dashboard
**Description:** After logging in, the Patient sees their dashboard. This screen provides an at-a-glance view of their lab report history. It will list all their Glucose Marker Reports and display a bar chart visualizing glucose levels over time. The UI must be mobile-first and responsive.

**Functional Requirements:**

#### FR-3: View List of Reports
A logged-in Patient can view a list of all their historical Glucose Marker Reports, sorted with the most recent first.

**Consequences (testable):**
- The list displays the following for each Report: Report Date, Glucose Value, and Status.
- The system only displays Reports belonging to the logged-in Patient.
- If a Patient has no reports, a message "You have no reports yet." is displayed.

#### FR-4: View Report Details
A Patient can select a Report from the list to view its full details.

**Consequences (testable):**
- Viewing a report shows all its fields: Patient Name, Report Date, Glucose Value, Status, and any Notes from the Admin.

#### FR-5: View Glucose Trend Chart
The Patient Dashboard displays a bar chart of the Patient's glucose values over time.

**Consequences (testable):**
- The chart's X-axis represents the Report Date.
- The chart's Y-axis represents the Glucose Value.
- The chart renders all available Glucose Marker Reports for the Patient.

### 4.3 Admin Authentication & Panel
**Description:** Admins access a separate, secure web interface (the Admin Panel). They log in using a phone number and a static password. The system must ensure only authorized Admins can access this panel. [ASSUMPTION: The initial Admin user credentials are for bootstrapping purposes only and the operator will change them immediately upon first login.]

**Functional Requirements:**

#### FR-6: Admin Login with Phone and Password
An Admin can log in to the Admin Panel using their registered phone number and password.

**Consequences (testable):**
- Upon providing correct credentials, the Admin is redirected to the main Admin Panel dashboard.
- Upon entering incorrect credentials, the system displays an error message "Invalid credentials" and denies access.

#### FR-7: Seed Initial Admin User
The system ensures a default Admin user exists for initial setup.

**Consequences (testable):**
- On application startup, if no Admin user exists in the database, one is created with phone number `9999942496` and password `Hello@123!`.
- If any Admin user already exists, no action is taken.

#### FR-8: Secure Admin Session
The system shall establish a secure, authenticated session for an Admin after a successful login.

**Consequences (testable):**
- The Admin remains logged in while using the Admin Panel.
- The session expires after 1 hour of inactivity, requiring the Admin to log in again.

### 4.4 Admin Report Management
**Description:** The core function of the Admin Panel is to manage patient reports. An Admin can create new patients and then create, view, and edit Glucose Marker Reports for any patient in the system. All actions must be performed through a simple UI. [ASSUMPTION: Patients cannot self-register; they must be created by an Admin.]

**Functional Requirements:**

#### FR-9: Admin Creates a Patient
An Admin can create a new Patient record in the system.

**Consequences (testable):**
- An Admin can access a form to create a new Patient.
- The Admin provides the Patient's name and a 10-digit phone number.
- Upon submission, the system creates a new Patient record.
- The system prevents the creation of a new Patient if the phone number is already in use.

#### FR-10: Admin Creates a Report for a Patient
An Admin can create a new Glucose Marker Report for a selected Patient.

**Consequences (testable):**
- The Admin can select a Patient from a list or via search by name or phone number.
- The Admin enters the Report Date, Glucose Value (numeric), Report Status (from a dropdown list: `Final`, `Corrected`), and optional Notes into a form.
- Upon submission, a new Report is created and associated with the selected Patient.
- All input fields are validated (e.g., date is a valid date, glucose value is a positive number).

#### FR-11: Admin Edits a Report
An Admin can edit the details of an existing Glucose Marker Report.

**Consequences (testable):**
- The Admin can select an existing report for a patient and modify its Report Date, Glucose Value, Status, and Notes.
- Changes are saved and are immediately reflected when the Patient views the report.

### 4.5 End-to-End Functionality
**Description:** This feature ensures that the user interfaces for both Patients and Admins are fully interactive and connected to the backend services. Forms will correctly submit data, and data displays like charts and lists will be populated with real-time information from the database, replacing any static or mock data used during initial UI development.

**Functional Requirements:**

#### FR-12: Functional Patient Login and Dashboard
The Patient login form and dashboard components shall be fully functional and integrated with the backend.

**Consequences (testable):**
- When a Patient submits their phone number and OTP via the login form, a request is sent to the backend authentication API.
- Upon successful login, the Patient Dashboard fetches the logged-in Patient's report data from the backend API.
- The report list on the dashboard is dynamically rendered based on the data received from the API.
- The glucose trend chart is dynamically rendered using the report data received from the API.

#### FR-13: Functional Admin Panel
The Admin Panel forms for login, patient creation, and report management shall be fully functional and integrated with the backend.

**Consequences (testable):**
- When an Admin submits their credentials via the login form, a request is sent to the backend authentication API.
- When an Admin submits the "Create Patient" form, the form data is sent via an API request to create a new patient record in the database.
- When an Admin submits the "Create Report" or "Edit Report" form, the form data is sent via an API request to create or update the corresponding report record in the database.
- The system provides user feedback upon successful form submission (e.g., a success message) or on failure (e.g., an error message from the API).

## 5. Non-Goals (Explicit)
*   Integration with any SMS gateway for OTP delivery.
*   Patient self-registration or profile management (e.g., changing their phone number).
*   Uploading of any file types (e.g., PDF, JPG) for reports.
*   Support for any report type other than the Glucose Marker Report.
*   Admins managing other Admins (no super-admin role).
*   Password reset or "forgot password" functionality for Admins.
*   Any form of communication (e.g., messaging, notifications) between Patients and Admins.
*   Billing, invoicing, or payment features.

## 6. MVP Scope
### 6.1 In Scope
*   All features and functional requirements (FR-1 to FR-13) listed above.
*   A complete, two-sided application: a mobile-first web app for Patients and a secure Admin Panel for lab staff.
*   Core functionality for one report type: Glucose Marker Report.
*   Basic security, logging, and architectural foundations for future expansion.

### 6.2 Out of Scope for MVP
*   Everything listed in Section 5 (Non-Goals).
*   Multi-language support.
*   Advanced data analytics or reporting for Admins.
*   Customizable report templates.

## 7. Success Metrics
### Primary
*   **Patient Engagement**: 50% of Patients with at least one report log in to view their dashboard weekly. (Validates FR-1, FR-3, FR-5, FR-12)
*   **Admin Efficiency**: The median time to create and save a new patient report is under 60 seconds. (Validates FR-10, FR-13)

### Secondary
*   **Patient Adoption**: 80% of newly created Patients log in at least once within 72 hours of their first report being created.

### Counter-metrics (do not optimize)
*   **Admin Data Entry Errors**: Rate of reports that are edited within 24 hours of creation.
*   **Patient Support Inquiries**: Number of support requests per week related to login issues or inability to find a report.

## 8. Open Questions
None at this time. Decisions required for v1 have been made and are documented in this PRD.

## 9. Assumptions Index
1.  `[ASSUMPTION: A static OTP is a sufficient security measure for the initial MVP launch, to be replaced by a dynamic, SMS-based OTP in a future version.]` (from Section 4.1)
2.  `[ASSUMPTION: The initial Admin user credentials are for bootstrapping purposes only and the operator will change them immediately upon first login.]` (from Section 4.3)
3.  `[ASSUMPTION: Patients cannot self-register; they must be created by an Admin.]` (from Section 4.4)

## 10. Cross-Cutting Non-Functional Requirements
### 10.1 Security
*   **NFR-1: Secure Communication**: All communication between clients (Patient app, Admin Panel) and the server must be encrypted using HTTPS/TLS.
*   **NFR-2: Role-Based Access Control (RBAC)**: The system must enforce strict separation between Patient and Admin roles. A Patient API endpoint must never return data for another Patient.
*   **NFR-3: Input Validation**: All user-provided input on both the client and server must be validated to prevent common vulnerabilities like XSS and injection attacks.
*   **NFR-4: Audit Logging**: The system must log key security events, including successful/failed logins for both roles and all report creation/modification events by Admins. The log must include the timestamp, actor (e.g., Admin phone number), and the action performed.
*   **NFR-5: Rate Limiting**: Authentication endpoints (`/login`) must be rate-limited to 5 requests per minute per IP address to protect against brute-force attacks.

### 10.2 Architecture
*   **NFR-6: Scalability**: The architecture must be designed to allow for the addition of new report types in the future without requiring a full rewrite of the core application. This implies a flexible database schema for reports.

### 10.3 User Experience
*   **NFR-7: Mobile-First Responsive UI**: The Patient-facing application must be designed for a mobile-first experience (e.g., viewport width 360px) and be fully responsive to work on common desktop browser resolutions. The Admin Panel must be functional on standard desktop resolutions (e.g., 1280px width and above).
