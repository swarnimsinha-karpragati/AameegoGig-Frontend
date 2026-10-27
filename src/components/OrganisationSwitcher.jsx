import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { organisationsForSwitcher } from "../utils/organisationSwitch";
import "./OrganisationSwitcher.css";

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
  const current = options.find((org) => org.current) || options[0];
  const [open, setOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    setOtp("");
  }, [challenge?.code, challenge?.sendTo]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!options.length || !current) return null;

  return (
    <div className="org-switcher" ref={rootRef}>
      <button
        type="button"
        className="org-switcher__button"
        aria-label="Organisation"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={busy}
        title={current.name}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="org-switcher__name">{current.name}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {open && (
        <ul className="org-switcher__menu" role="listbox" aria-label="Organisation">
          {options.map((org) => (
            <li key={org.code}>
              <button
                type="button"
                role="option"
                aria-selected={org.current}
                className={org.current ? "is-current" : undefined}
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  if (!org.current) onSelect(org.code);
                }}
              >
                {org.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {(challenge || error) && (
        <div className="org-switcher__panel" role="dialog" aria-label="Switch organisation">
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
              <div className="org-switcher__actions">
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
            <p className="org-switcher__error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
