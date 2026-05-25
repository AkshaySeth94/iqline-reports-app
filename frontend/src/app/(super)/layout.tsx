import React from 'react';
import AppHeader from '@/components/AppHeader';

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <AppHeader tag="Platform" />
      <main className="app-main">{children}</main>
    </div>
  );
}
