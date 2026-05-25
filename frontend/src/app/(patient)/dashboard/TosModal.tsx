'use client';

import { useState } from 'react';

interface Props {
  onAcknowledge: () => void;
}

export default function TosModal({ onAcknowledge }: Props) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="tos-title">
      <div className="modal-card">
        <h2 id="tos-title" className="card-title">Terms of Service</h2>
        <div className="stack stack-3 mt-2">
          <p>
            By using LabDash, you agree to:
          </p>
          <ul className="list-disc pl-5 muted">
            <li>
              Allow partnered labs you&apos;ve visited to record glucose readings to your
              record.
            </li>
            <li>
              Allow the platform operator to view aggregated reports for audit and incident
              response within a 24-month window.
            </li>
            <li>
              Other labs cannot see your readings unless you visit them and we link your
              record at that lab&apos;s front desk.
            </li>
          </ul>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            I have read and agree to the terms above.
          </label>
          <button
            className="btn btn-primary"
            disabled={!agreed}
            onClick={onAcknowledge}
          >
            Acknowledge & continue
          </button>
        </div>
      </div>
    </div>
  );
}
