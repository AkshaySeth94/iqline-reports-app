export enum UserRole {
  SuperAdmin = 'SuperAdmin',
  LabAdmin = 'LabAdmin',
  Admin = 'Admin', // legacy v1 — migration promotes to LabAdmin; retained for grace-window JWT acceptance
  Patient = 'Patient',
}
