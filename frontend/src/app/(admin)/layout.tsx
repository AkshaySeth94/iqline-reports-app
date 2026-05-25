import React from 'react';
import AppHeader from '@/components/AppHeader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <AppHeader tag="Admin console" />
      <main className="app-main">{children}</main>
    </div>
  );
}
