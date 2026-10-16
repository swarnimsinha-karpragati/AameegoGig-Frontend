import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Badge, Button } from "../../../design-system";
import { reviewTemplateWithAi } from "../../../services/letterAiService";
import { draftToPayload, getApiError } from "../../../utils/letterForms";
import { LETTERS_COPY } from "../../../utils/lettersCopy";

const AI = LETTERS_COPY.ai;

/**
 * Check tab: AI suggestions for the current draft. A suggestion with a text fix can be applied
 * (replaces its exact text once); every suggestion can be dismissed. Nothing changes on its own.
 */
export default function AiReviewPanel({ draft, onUpdate, onApplied, disabled }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const check = useMutation({ mutationFn: reviewTemplateWithAi });

  const run = async () => {
    setError("");
    const payload = draftToPayload(draft);
    try {
      const data = await check.mutateAsync(payload);
      setResult({ checkedBody: draft.bodyHtml, items: data?.suggestions || [] });
    } catch (err) {
      setError(getApiError(err, AI.error).message);
    }
  };

  const remove = (index) => setResult((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }));

  const apply = (index) => {
    const { find, replace } = result.items[index];
    onUpdate({ bodyHtml: draft.bodyHtml.replace(find, () => replace) });
    onApplied?.();
    remove(index);
  };

  return (
    <section className="wz-tpl-side__section" aria-busy={check.isPending}>
      <p className="wz-letters__cell-sub">{AI.checkIntro}</p>
      <div>
        <Button variant="outline" onClick={run} loading={check.isPending} disabled={disabled || !draft.bodyHtml}>
          {result ? AI.checkAgain : AI.checkRun}
        </Button>
      </div>
      {error && (
        <p className="wz-fields__error" role="alert">
          {error}
        </p>
      )}
      {result && result.checkedBody !== draft.bodyHtml && <p className="wz-letters__notice">{AI.checkStale}</p>}
      {result && result.items.length === 0 && <p className="wz-letters__cell-sub">{AI.checkEmpty}</p>}
      {result && result.items.length > 0 && (
        <ul className="wz-letters__ai-suggestions">
          {result.items.map((item, index) => {
            const canApply = !disabled && item.find && draft.bodyHtml.includes(item.find);
            return (
              <li key={`${item.type}-${item.message}`} className="wz-letters__ai-suggestion">
                <span>
                  <Badge tone="info">{AI.suggestionTypes[item.type] || item.type}</Badge>
                </span>
                <span>{item.message}</span>
                <span className="wz-rte__ai-actions">
                  {canApply && (
                    <Button size="sm" onClick={() => apply(index)}>
                      {AI.applySuggestion}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(index)}>
                    {AI.dismissSuggestion}
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
