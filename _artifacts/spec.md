# Product specification

_Baseline — Run #1 (2026-05-24)_

Build a mobile-first lab report management web app with the MERN stack. There should be two roles: patient and admin. Patients log in using phone number + OTP and can view only their own reports. Admins log in to a secure admin panel and can create, edit, and upload reports for a selected patient.

Start with one report type: Glucose Marker Report. For each report, store patient info, report date, glucose value, report status, and optional notes. In the patient dashboard, show a list of reports and a bar chart of glucose values by date.

Requirements: mobile-first responsive UI, secure authentication, role-based authorization, input validation, audit logging, rate limiting, encrypted HTTPS communication, and scalable architecture for adding more report types later.

Tech stack: React, Node.js, Express, MongoDB, JWT or secure session auth, Chart.js/Recharts for charts.

Deliver: patient app, admin panel, database schema, REST APIs, and secure production-ready architecture.

1. I need a static default otp for v1 and no sms gateway.
2. Populate 1 admin user if none exists in mongo with 9999942496 as the phone number and Hello@123! as the password. 
3. there will be no report file upload by admin. Just a UI panel in which we will intake the result of the test after which report will be visible on patients mobile app.

---

## Change request — Run #2 (2026-05-24)

fix: ensure the patient login form, dashboard, and admin panel are functional with real form handlers and real chart data

---

## Change request — Run #3 (2026-05-25)

Change the theme of the project from light to dark
