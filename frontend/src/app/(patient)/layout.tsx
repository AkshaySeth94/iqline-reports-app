import React from 'react';
import AppHeader from '@/components/AppHeader';

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <AppHeader tag="Patient portal" />
      <main className="app-main">{children}</main>
    </div>
  );
}
