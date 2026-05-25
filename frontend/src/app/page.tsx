import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="landing">
      <div className="landing-inner">
        <span className="landing-eyebrow">
          <span className="brand-mark size-[18px] text-[10px]">LD</span>
          LabDash
        </span>
        <h1 className="landing-title">Your lab reports, beautifully simplified.</h1>
        <p className="landing-sub">
          Track glucose trends, review lab history, and manage patients from a single,
          calm dashboard.
        </p>
        <div className="landing-actions">
          <Link href="/login" className="btn btn-primary">
            Sign in
          </Link>
          <Link href="/dashboard" className="btn btn-secondary">
            Patient demo
          </Link>
          <Link href="/panel" className="btn btn-ghost">
            Admin demo
          </Link>
        </div>
      </div>
    </main>
  );
}
