import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Badge, Button, ConfirmDialog, Spinner } from "../../../design-system";
import { useLetterTemplateAction, useLetterTemplateVersions } from "../../../hooks/useLetters";
import { formatLetterDate, getApiError, isTemplateVersionConflict } from "../../../utils/letterForms";
import { LETTERS_COPY, format } from "../../../utils/lettersCopy";
import { useToast } from "../../Toast";

const COPY = LETTERS_COPY.editor;

/** Saved versions of a template with Restore (saved as a new version, so nothing is lost). */
export default function TemplateHistory({ template, canEdit, hasUnsavedChanges, editingVersion, onRestored, onVersionConflict }) {
  const toast = useToast();
  const { data: versions = [], isLoading, isError } = useLetterTemplateVersions(template?._id);
  const action = useLetterTemplateAction();
  const [pending, setPending] = useState(null);

  const restore = async () => {
    try {
      const restored = await action.mutateAsync({
        action: "restore",
        id: template._id,
        value: pending.version,
        version: editingVersion,
      });
      toast.success(format(COPY.restored, { from: pending.version, to: restored?.version ?? "" }));
      setPending(null);
      if (restored) onRestored(restored);
    } catch (error) {
      const apiError = getApiError(error, COPY.restoreError);
      if (isTemplateVersionConflict(apiError)) {
        setPending(null);
        onVersionConflict();
        return;
      }
      toast.error(apiError.message);
    }
  };

  return (
    <section className="wz-tpl-side__section" aria-labelledby="wz-tpl-history-title">
      <h3 id="wz-tpl-history-title">{COPY.history}</h3>
      {isLoading && <Spinner size="sm" label={COPY.historyLoading} />}
      {isError && (
        <p className="wz-letters__notice wz-letters__notice--error" role="alert">
          {COPY.historyError}
        </p>
      )}
      {!isLoading && !isError && versions.length === 0 && <p className="wz-letters__cell-sub">{COPY.historyEmpty}</p>}
      {versions.length > 0 && (
        <ol className="wz-tpl-history">
          {versions.map((entry) => {
            const current = entry.version === template?.version;
            return (
              <li key={entry.version} className="wz-tpl-history__item">
                <div className="wz-tpl-history__head">
                  <span className="wz-letters__cell-title">{format(COPY.version, { version: entry.version })}</span>
                  {current && <Badge tone="brand">{COPY.current}</Badge>}
                </div>
                <span className="wz-letters__cell-sub">
                  {formatLetterDate(entry.createdAt)}
                  {entry.editedByName ? ` · ${entry.editedByName}` : ""}
                </span>
                {entry.note && <span className="wz-tpl-history__note">{entry.note}</span>}
                {canEdit && !current && (
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<RotateCcw size={16} />}
                      aria-label={format(COPY.restoreVersion, { version: entry.version })}
                      onClick={() => setPending(entry)}
                    >
                      {COPY.restore}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <ConfirmDialog
        open={Boolean(pending)}
        title={format(COPY.restoreTitle, { version: pending?.version })}
        message={hasUnsavedChanges ? COPY.restoreMessageUnsaved : COPY.restoreMessage}
        confirmLabel={COPY.restore}
        loading={action.isPending}
        onConfirm={restore}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}
