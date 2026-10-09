import React, { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Toggle } from "../design-system";
import { useAiSettings, useUpdateAiSettings } from "../hooks/useAi";
import "./OrgProfileCard.css";
import "./AttendanceSettingsCard.css";

const HELP_ID = "ai-personal-data-help";

const usd = (value) => `$${Number(value || 0).toFixed(2)}`;

/** Settings → Configuration: AI help status, this month's spend and the personal-data switch. */
export default function AiSettingsCard() {
  const { data, isError } = useAiSettings();
  const updateMutation = useUpdateAiSettings();
  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = async (next) => {
    setMessage("");
    setError("");
    setPending(next);
    try {
      const result = await updateMutation.mutateAsync({ personalData: next });
      clearTimeout(timer.current);
      setMessage(result?.message || "Saved.");
      timer.current = setTimeout(() => setMessage(""), 3500);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save the AI setting. Please try again.");
    } finally {
      setPending(null);
    }
  };

  if (isError) {
    return (
      <div className="org-profile-card">
        <p className="org-profile-card__msg error" role="alert">
          Could not load AI settings. Refresh the page to try again.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="org-profile-card">
        <div className="org-profile-card__loading">Loading AI settings…</div>
      </div>
    );
  }

  return (
    <div className="org-profile-card">
      <div className="org-profile-card__head">
        <Sparkles size={20} />
        <div>
          <h3>AI help</h3>
          <p>AI drafts and checks letters for HR to review. Nothing is saved or issued without a person.</p>
        </div>
      </div>

      {!data.enabled ? (
        <p className="attendance-settings__help">
          AI help is not switched on for your organization. Contact Workza support to turn it on.
        </p>
      ) : (
        <>
          <p className="attendance-settings__help">
            Used this month: {usd(data.usedThisMonthUsd)} of {usd(data.monthlyBudgetUsd)}. The allowance resets on the 1st.
          </p>
          <div className="attendance-settings__row">
            <Toggle
              label="Allow AI features that use personal details"
              checked={pending ?? data.personalData}
              onChange={handleChange}
              disabled={pending !== null}
              aria-describedby={HELP_ID}
            />
            <div id={HELP_ID} className="attendance-settings__help">
              <p>Turns on Import from Word and Fill answers from a note. These send a letter's text or a pasted note, which can include names and salaries, to the AI provider.</p>
              <p>Drafting, rewriting and checking templates never send employee details and work with this off.</p>
            </div>
          </div>
        </>
      )}

      <div aria-live="polite">
        {message ? <p className="org-profile-card__msg success">{message}</p> : null}
        {error ? <p className="org-profile-card__msg error" role="alert">{error}</p> : null}
      </div>
    </div>
  );
}
