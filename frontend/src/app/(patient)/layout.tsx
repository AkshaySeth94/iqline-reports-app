import React from 'react';

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <header>
        <h1>LabDash</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}
