import { useEffect, useState } from "react";
import { organisationsForSwitcher } from "../utils/organisationSwitch";

export default function OrganisationSwitcher({
  organisations,
  currentCode,
  busy,
  error,
  challenge,
  onSelect,
  onConfirmOtp,
  onCancelChallenge,
}) {
  const options = organisationsForSwitcher(organisations, currentCode);
  const [otp, setOtp] = useState("");
  const selected = options.some((org) => org.code === currentCode) ? currentCode : "";

  useEffect(() => {
    setOtp("");
  }, [challenge?.code, challenge?.sendTo]);

  if (!options.length) return null;

  return (
    <div className="org-switcher">
      <label htmlFor="org-switcher">Organisation</label>
      <select
        id="org-switcher"
        value={selected}
        disabled={busy}
        onChange={(event) => {
          const next = event.target.value;
          if (next && next !== currentCode) onSelect(next);
        }}
      >
        {options.map((org) => (
          <option key={org.code} value={org.code}>
            {org.name}
          </option>
        ))}
      </select>
      {(challenge || error) && (
        <div className="org-switch-panel" role="dialog" aria-label="Switch organisation">
          {challenge && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (otp.length === 6) onConfirmOtp(challenge.code, otp);
              }}
            >
              <p>
                Code sent to <strong>{challenge.sendTo}</strong>
              </p>
              <input
                aria-label="Verification code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <div className="org-switch-actions">
                <button type="submit" disabled={busy || otp.length !== 6}>
                  Continue
                </button>
                <button type="button" onClick={onCancelChallenge} disabled={busy}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          {error && (
            <p className="org-switch-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
