import React from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1>Admin Panel</h1>
      <main>{children}</main>
    </div>
  );
}
