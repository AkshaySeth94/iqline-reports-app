import OtpLoginForm from '@/components/OtpLoginForm';

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">LD</span>
          <div>
            <div className="font-semibold tracking-tight">LabDash</div>
            <div className="text-sm muted">Multi-lab glucose reports</div>
          </div>
        </div>
        <h1 className="auth-heading">Sign in</h1>
        <p className="auth-sub">Enter your phone number and we&apos;ll send you an OTP.</p>
        <OtpLoginForm />
      </div>
    </main>
  );
}
