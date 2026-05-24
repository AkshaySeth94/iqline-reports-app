import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Welcome to LabDash</h1>
      <div>
        <Link href="/login">Login</Link>
      </div>
      <div>
        <Link href="/(patient)/dashboard">Go to Patient Dashboard (dev)</Link>
      </div>
      <div>
        <Link href="/(admin)/panel">Go to Admin Panel (dev)</Link>
      </div>
    </main>
  );
}
