# LabDash Patient Report Portal — Epic & Story Breakdown

## Requirements Inventory
**Functional Requirements (FRs):**
*   **FR-1:** Patient Login with Phone and OTP
*   **FR-2:** Secure Patient Session
*   **FR-3:** View List of Reports
*   **FR-4:** View Report Details
*   **FR-5:** View Glucose Trend Chart
*   **FR-6:** Admin Login with Phone and Password
*   **FR-7:** Seed Initial Admin User
*   **FR-8:** Secure Admin Session
*   **FR-9:** Admin Creates a Patient
*   **FR-10:** Admin Creates a Report for a Patient
*   **FR-11:** Admin Edits a Report
*   **FR-12:** Functional Patient Login and Dashboard
*   **FR-13:** Functional Admin Panel

**Non-Functional Requirements (NFRs):**
*   **NFR-1:** Secure Communication
*   **NFR-2:** Role-Based Access Control (RBAC)
*   **NFR-3:** Input Validation
*   **NFR-4:** Audit Logging
*   **NFR-5:** Rate Limiting
*   **NFR-6:** Scalability
*   **NFR-7:** Mobile-First Responsive UI

## FR Coverage Map
| Requirement | Epic / Story |
|-------------|--------------|
| FR-1        | Epic 3 / Story 3.1 |
| FR-2        | Epic 3 / Story 3.2 |
| FR-3        | Epic 3 / Story 3.3 |
| FR-4        | Epic 3 / Story 3.4 |
| FR-5        | Epic 3 / Story 3.5 |
| FR-6        | Epic 2 / Story 2.1 |
| FR-7        | Epic 1 / Story 1.2 |
| FR-8        | Epic 2 / Story 2.2 |
| FR-9        | Epic 2 / Story 2.3 |
| FR-10       | Epic 2 / Story 2.4 |
| FR-11       | Epic 2 / Story 2.5 |
| FR-12       | Epic 3 / Story 3.6 |
| FR-13       | Epic 2 / Story 2.6 |
| NFR-2       | Epic 4 / Story 4.2 |
| NFR-3       | Epic 4 / Story 4.1 |
| NFR-4       | Epic 4 / Story 4.4 |
| NFR-5       | Epic 4 / Story 4.3 |
| NFR-6       | Epic 1 / Story 1.3 |
| NFR-7       | Epic 4 / Story 4.5 |

## Epic List

## Epic 1: Project Foundation & Initial Setup

This epic establishes the core technical foundation of the project. After this epic, developers will have a working monorepo with a basic frontend and backend application, connected to a database, and seeded with the initial administrative user required for all subsequent functionality. This epic does not deliver direct user-facing value but is a necessary prerequisite for all other epics.
**FRs covered:** FR-7, NFR-6

### Story 1.1: Initialize Monorepo Project Structure
`traces: { prd: bootstrap, arch: ADR-monorepo }`

As a developer,
I want a monorepo containing a scaffolded Next.js frontend and NestJS backend,
So that I have a consistent and integrated development environment to build upon.

**Acceptance Criteria:**

**Given** a clean checkout of the repository
**When** I run `npm install` in the root
**Then** dependencies for both `frontend` and `backend` workspaces are installed
**And** I can run the `frontend` and `backend` applications with a single command.

### Story 1.2: Establish Database Connection and Core Schemas
`traces: { prd: FR-7, arch: ADR-state }`

As a developer,
I want the NestJS backend to connect to a MongoDB database and have initial Mongoose schemas for Users and Reports,
So that the application can persist and retrieve data.

**Acceptance Criteria:**

**Given** the backend application is running with valid MongoDB connection details
**When** the application starts
**Then** it successfully connects to the MongoDB instance
**And** Mongoose schemas for `User` (with fields for phone number, password, role) and `Report` are defined.

### Story 1.3: Seed Initial Admin User
`traces: { prd: FR-7, arch: ADR-state }`

As a system administrator,
I want the application to automatically create a default Admin user on first startup,
So that I can log in to the Admin Panel without manual database intervention.

**Acceptance Criteria:**

**Given** the database has no users in the `users` collection
**When** the backend application starts up
**Then** a new user record is created with phone number `9999942496`, a securely hashed version of the password `Hello@123!`, and the role `Admin`.
**And** a log message indicates that the admin user was created.
**Given** the database already contains at least one user with the `Admin` role
**When** the backend application starts up
**Then** no new user is created.

## Epic 2: Admin Portal for Report Management

This epic delivers the complete workflow for the Admin persona, Anand. After this epic, an Admin can log in securely, create new patient records, and then create and edit Glucose Marker Reports for those patients. This provides a fully functional administrative interface for managing the core data of the application.
**FRs covered:** FR-6, FR-8, FR-9, FR-10, FR-11, FR-13

### Story 2.1: Implement Admin Login
`traces: { prd: FR-6, arch: ADR-auth }`

As an Admin (Anand),
I want to log in to the Admin Panel using my phone number and password,
So that I can access the secure report management dashboard.

**Acceptance Criteria:**

**Given** the seeded Admin user exists
**When** I navigate to the Admin Panel login page and enter phone `9999942496` and password `Hello@123!`
**Then** I am granted access and redirected to the Admin dashboard
**And** a JWT is stored in my browser for session management.
**Given** the seeded Admin user exists
**When** I attempt to log in with the correct phone number but an incorrect password
**Then** I see an error message "Invalid credentials" and remain on the login page.

### Story 2.2: Implement Secure Admin Session
`traces: { prd: FR-8, arch: ADR-auth }`

As an Admin (Anand),
I want my session to remain active while I use the panel but expire after a period of inactivity,
So that my access is secure.

**Acceptance Criteria:**

**Given** I am logged in as an Admin
**When** I navigate between different pages of the Admin Panel
**Then** I remain logged in.
**Given** I am logged in as an Admin and have been inactive for 61 minutes
**When** I attempt to perform an action that requires authentication
**Then** my request is rejected with a 401 Unauthorized status and I am redirected to the login page.

### Story 2.3: Create a New Patient
`traces: { prd: FR-9, arch: ADR-contracts }`

As an Admin (Anand),
I want to create a new patient record with their name and phone number,
So that I can later create a report for them.

**Acceptance Criteria:**

**Given** I am logged in to the Admin Panel
**When** I fill out the "Create Patient" form with a unique 10-digit phone number and a name, and submit it
**Then** a new patient record is created in the database
**And** I receive a success confirmation message.
**Given** I am logged in to the Admin Panel
**When** I attempt to create a patient with a phone number that already exists
**Then** the system prevents the creation and displays an error message "Phone number is already in use."

### Story 2.4: Create a Glucose Marker Report for a Patient
`traces: { prd: FR-10, arch: ADR-data }`

As an Admin (Anand),
I want to create a new Glucose Marker Report for a specific patient,
So that the patient can view their results.

**Acceptance Criteria:**

**Given** I am logged in and a patient exists in the system
**When** I select the patient, and fill in the report form with a valid Report Date, a numeric Glucose Value, a Status of `Final`, and optional Notes, and submit it
**Then** a new report is created and associated with that patient
**And** I am shown a confirmation of success.
**Given** I am logged in
**When** I attempt to submit the report form with a non-numeric glucose value
**Then** the form shows a validation error and the report is not created.

### Story 2.5: Edit an Existing Report
`traces: { prd: FR-11, arch: ADR-data }`

As an Admin (Anand),
I want to edit the details of a report I previously created,
So that I can correct any errors.

**Acceptance Criteria:**

**Given** I am logged in and a report exists for a patient
**When** I navigate to the report, change the Glucose Value from `150` to `152`, and save the changes
**Then** the report record in the database is updated with the new value
**And** the updated information is visible in the Admin Panel.

### Story 2.6: Implement Functional Admin Panel Forms
`traces: { prd: FR-13, arch: ADR-contracts }`

As an Admin (Anand),
I want the forms in the Admin Panel to be fully functional and connected to the backend,
So that I can manage patient and report data effectively.

**Acceptance Criteria:**

**Given** I am on the Admin login page
**When** I fill in my credentials and click "Login"
**Then** a POST request is sent to the backend authentication API with my credentials.
**Given** I am logged in as an Admin and on the "Create Patient" page
**When** I fill out the form and click "Create"
**Then** a POST request is sent to the backend API to create a new patient record with the form data.
**Given** I am logged in as an Admin and on the "Create Report" page for a patient
**When** I fill out the form and click "Submit"
**Then** a POST request is sent to the backend API to create a new report record with the form data.
**Given** any of the above form submissions results in a successful API response
**When** the response is received
**Then** a success message is displayed to me in the UI.
**Given** any of the above form submissions results in a failed API response
**When** the response is received
**Then** an error message from the API is displayed to me in the UI.

## Epic 3: Patient Dashboard & Report Visualization

This epic delivers the complete workflow for the Patient persona, Priya. After this epic, a Patient can log in using their phone number and a static OTP, view a list of their reports, see the full details of any report, and visualize their glucose trends over time on a chart. This fulfills the core value proposition for the end-user.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-12

### Story 3.1: Implement Patient Login
`traces: { prd: FR-1, arch: ADR-auth }`

As a Patient (Priya),
I want to log in to the app using my phone number and an OTP,
So that I can securely access my personal health data.

**Acceptance Criteria:**

**Given** an Admin has created a Patient record for me with my phone number
**When** I enter my phone number on the login page and then enter the static OTP `123456`
**Then** I am granted access and redirected to my Patient Dashboard
**And** a JWT is stored in my browser for session management.
**Given** I am a registered Patient
**When** I enter my phone number and an incorrect OTP (e.g., `000000`)
**Then** I see an error message "Invalid OTP" and remain on the login page.
**Given** I am not a registered Patient
**When** I enter my phone number `1234567890`
**Then** I see an error message "Phone number not found".

### Story 3.2: Implement Secure Patient Session
`traces: { prd: FR-2, arch: ADR-auth }`

As a Patient (Priya),
I want my session to be long-lived,
So that I don't have to log in every time I visit the app on my phone.

**Acceptance Criteria:**

**Given** I am logged in as a Patient
**When** I close my browser tab and reopen it 12 hours later
**Then** I am still logged in and can see my dashboard.
**Given** I am logged in as a Patient and have been inactive for 25 hours
**When** I attempt to refresh my dashboard
**Then** my request is rejected with a 401 Unauthorized status and I am redirected to the login page.

### Story 3.3: View List of Reports
`traces: { prd: FR-3, arch: ADR-runtime }`

As a Patient (Priya),
I want to see a list of all my past reports on my dashboard,
So that I can quickly see my history.

**Acceptance Criteria:**

**Given** I am logged in and have three Glucose Marker Reports in the system
**When** I land on my Patient Dashboard
**Then** I see a list of three reports, sorted with the most recent date first
**And** each item in the list displays the Report Date, Glucose Value, and Status.
**Given** I am logged in and have no reports
**When** I land on my Patient Dashboard
**Then** I see a message that says "You have no reports yet."

### Story 3.4: View Report Details
`traces: { prd: FR-4, arch: ADR-runtime }`

As a Patient (Priya),
I want to tap on a report in the list to see all its details,
So that I can read any specific notes from the lab.

**Acceptance Criteria:**

**Given** I am logged in and viewing my list of reports
**When** I click on a specific report
**Then** I am taken to a new view that displays the Patient Name, Report Date, Glucose Value, Status, and the Notes from the Admin for that report.

### Story 3.5: View Glucose Trend Chart
`traces: { prd: FR-5, arch: ADR-runtime }`

As a Patient (Priya),
I want to see a bar chart of my glucose values over time,
So that I can easily visualize my health trends.

**Acceptance Criteria:**

**Given** I am logged in and have three reports with dates 'May 1', 'May 15', 'May 30' and values '120', '140', '130' respectively
**When** I view my Patient Dashboard
**Then** I see a bar chart with three bars
**And** the X-axis is labeled with the report dates and the Y-axis represents the glucose value
**And** the height of the bars corresponds to their respective glucose values.

### Story 3.6: Implement Functional Patient Dashboard
`traces: { prd: FR-12, arch: ADR-runtime }`

As a Patient (Priya),
I want my login form and dashboard to be fully functional and display real data from the backend,
So that I can see my actual lab results and trends.

**Acceptance Criteria:**

**Given** I am on the Patient login page
**When** I submit my phone number and OTP
**Then** a POST request is sent to the backend authentication API.
**Given** I have successfully logged in
**When** the Patient Dashboard page loads
**Then** a GET request is sent to the backend API to fetch my reports.
**And** the report list is dynamically rendered on the page using the data received from the API.
**And** the glucose trend chart is dynamically rendered using the report data received from the API.

## Epic 4: Application Hardening & Security

This epic focuses on implementing the cross-cutting non-functional requirements that ensure the application is secure, robust, and provides a good user experience. It covers server-side validation, role-based access, protection against common attacks, audit logging, and mobile responsiveness.
**FRs covered:** NFR-2, NFR-3, NFR-4, NFR-5, NFR-7

### Story 4.1: Implement Server-Side Input Validation
`traces: { prd: NFR-3, arch: ADR-contracts }`

As a developer,
I want to ensure all data submitted to the API is validated on the server,
So that the application is protected from invalid data and common injection attacks.

**Acceptance Criteria:**

**Given** a client is trying to create a new patient
**When** the API request is sent with a phone number that is not 10 digits long
**Then** the server responds with a 400 Bad Request status and a descriptive error message
**And** no new patient is created in the database.
**Given** a client is trying to create a new report
**When** the API request is sent with a `glucoseValue` that is a string (e.g., "high") instead of a number
**Then** the server responds with a 400 Bad Request status and a descriptive error message
**And** no new report is created.

### Story 4.2: Enforce Role-Based Access Control (RBAC)
`traces: { prd: NFR-2, arch: ADR-auth }`

As a developer,
I want to protect API endpoints so they can only be accessed by users with the appropriate role,
So that Patients cannot access Admin functions or other patients' data.

**Acceptance Criteria:**

**Given** I am logged in as a Patient
**When** I attempt to make an API call to the endpoint for creating a new patient (e.g., `POST /api/patients`)
**Then** the server rejects the request with a 403 Forbidden status.
**Given** I am logged in as Patient A
**When** I attempt to make an API call to view reports for Patient B
**Then** the server rejects the request with a 403 Forbidden status or returns an empty list.

### Story 4.3: Implement Rate Limiting on Authentication
`traces: { prd: NFR-5, arch: ADR-auth }`

As a developer,
I want to limit the number of login attempts from a single IP address,
So that the system is protected from brute-force password guessing attacks.

**Acceptance Criteria:**

**Given** an unauthenticated user from a specific IP address
**When** they make 5 failed login attempts to any authentication endpoint within one minute
**Then** the 6th attempt from the same IP within that minute is rejected with a 429 Too Many Requests status.
**And** after the one-minute window passes, a new login attempt from that IP is processed normally.

### Story 4.4: Implement Audit Logging
`traces: { prd: NFR-4, arch: ADR-state }`

As a system administrator,
I want key security and data modification events to be logged,
So that I can audit system activity if a security incident occurs.

**Acceptance Criteria:**

**Given** an Admin user is logged in
**When** they successfully create a new report for a patient
**Then** a log entry is created containing the timestamp, the Admin's user identifier, the action (`REPORT_CREATED`), and the ID of the new report.
**Given** any user attempts to log in with incorrect credentials
**When** the login fails
**Then** a log entry is created containing the timestamp, the action (`LOGIN_FAILURE`), and the phone number that was used.

### Story 4.5: Ensure Mobile-First Responsive UI for Patients
`traces: { prd: NFR-7, arch: ADR-runtime }`

As a Patient (Priya),
I want the application to look and work well on my smartphone,
So that I can easily check my results on the go.

**Acceptance Criteria:**

**Given** I am viewing the Patient Dashboard on a device with a 360px wide viewport
**When** I view the list of reports and the chart
**Then** all content is legible, fits within the screen without horizontal scrolling, and all interactive elements are easily tappable.
**Given** I am viewing the same dashboard on a desktop with a 1280px wide viewport
**When** I view the list of reports and the chart
**Then** the layout adapts to use the available space effectively without looking stretched or broken.
