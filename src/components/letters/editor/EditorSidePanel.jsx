import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ExternalLink, RotateCcw } from "lucide-react";
import { Button, ConfirmDialog, ModuleSwitcher, Select, Toggle } from "../../../design-system";
import { useLetterTemplateAction } from "../../../hooks/useLetters";
import { GROUP_OPTIONS } from "../../../utils/letterCatalog";
import { LAYOUT_OPTIONS, RECIPIENT_TYPES, getApiError } from "../../../utils/letterForms";
import { LETTERS_COPY } from "../../../utils/lettersCopy";
import { ORG_PROFILE_SETTINGS_PATH, vendorScopedPath } from "../../../utils/vendorPath";
import { useToast } from "../../Toast";
import InputFieldsManager from "../InputFieldsManager";
import TemplateHistory from "./TemplateHistory";

const COPY = LETTERS_COPY.editor;
const ID = "wz-tpl-side";

export const EDITOR_TABS = [
  { id: "questions", label: COPY.questionsTab },
  { id: "letterhead", label: COPY.letterhead },
  { id: "about", label: COPY.about },
];

function TabPanel({ id, active, children }) {
  return (
    <div
      className="wz-tpl-side__panel"
      role="tabpanel"
      id={`${ID}-panel-${id}`}
      aria-labelledby={`${ID}-tab-${id}`}
      hidden={id !== active}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

const FIELD_SELECTORS = {
  category: '[name="category"]',
  recipientType: '[name="recipientType"]',
};

/**
 * Questions / Letterhead / About tabs beside the letter canvas. The parent owns the active tab so
 * save errors can switch to the tab that needs attention; `focusTarget` then focuses the field.
 */
const EditorSidePanel = forwardRef(function EditorSidePanel(
  { tab, onTabChange, draft, errors = {}, readOnly, template, isNew, dirty, keyLocks, onUpdate, onInsert, onRemoveQuestion, onTemplateReplaced },
  ref
) {
  const toast = useToast();
  const containerRef = useRef(null);
  const templateAction = useLetterTemplateAction();
  const [confirmReset, setConfirmReset] = useState(false);

  useImperativeHandle(ref, () => ({
    focusTarget: ({ field, index }) => {
      const root = containerRef.current;
      if (!root) return;
      const selector = field === "inputFields" && index != null ? `[name="inputField-${index}-label"]` : FIELD_SELECTORS[field];
      const el = selector ? root.querySelector(selector) : null;
      if (el && !el.disabled) el.focus();
      else root.querySelector(`#${ID}-tab-${tab}`)?.focus();
    },
  }));

  const handleReset = async () => {
    try {
      const reset = await templateAction.mutateAsync({ action: "reset", id: template._id });
      toast.success(COPY.resetDone);
      setConfirmReset(false);
      if (reset) onTemplateReplaced(reset);
    } catch (error) {
      toast.error(getApiError(error, COPY.resetError).message);
    }
  };

  const settingsHref = vendorScopedPath(window.location, ORG_PROFILE_SETTINGS_PATH);
  const canReset = !readOnly && template?.isSystem && template?.isCustomised;

  return (
    <aside ref={containerRef} className="wz-tpl-side" aria-label={COPY.sidePanelLabel}>
      <ModuleSwitcher
        className="wz-tpl-side__tabs"
        tabs={EDITOR_TABS}
        activeId={tab}
        onChange={onTabChange}
        ariaLabel={COPY.sidePanelLabel}
        idPrefix={ID}
      />
      <TabPanel id="questions" active={tab}>
        <section className="wz-tpl-side__section">
          <h3>{COPY.questions}</h3>
          <InputFieldsManager
            fields={draft.inputFields}
            onChange={(inputFields) => onUpdate({ inputFields })}
            errors={errors.inputFields}
            onInsert={onInsert}
            onRemove={onRemoveQuestion}
            keyLocks={keyLocks}
            disabled={readOnly}
          />
        </section>
      </TabPanel>

      <TabPanel id="letterhead" active={tab}>
        <section className="wz-tpl-side__section">
          <p className="wz-letters__cell-sub">{COPY.letterheadIntro}</p>
          {errors.layout && (
            <p className="wz-fields__error" role="alert">
              {errors.layout}
            </p>
          )}
          <ul className="wz-tpl-side__toggles">
            {LAYOUT_OPTIONS.map((option) => (
              <li key={option.key}>
                <Toggle
                  label={option.label}
                  checked={Boolean(draft.layout[option.key])}
                  onChange={(value) => onUpdate({ layout: { ...draft.layout, [option.key]: value } })}
                  disabled={readOnly}
                  aria-describedby={`${ID}-hint-${option.key}`}
                />
                <p id={`${ID}-hint-${option.key}`} className="wz-tpl-side__hint">
                  {option.hint}
                </p>
              </li>
            ))}
          </ul>
          <p className="wz-letters__cell-sub">{COPY.letterheadSettings}</p>
          <a className="wz-tpl-side__link" href={settingsHref} target="_blank" rel="noreferrer">
            {COPY.openSettings}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </section>
      </TabPanel>

      <TabPanel id="about" active={tab}>
        <section className="wz-tpl-side__section">
          <Select
            label={COPY.group}
            name="category"
            value={draft.category}
            onChange={(event) => onUpdate({ category: event.target.value })}
            options={GROUP_OPTIONS}
            error={errors.category}
            required
            disabled={readOnly}
          />
          <Select
            label={COPY.whoFor}
            name="recipientType"
            value={draft.recipientType}
            onChange={(event) => onUpdate({ recipientType: event.target.value })}
            options={RECIPIENT_TYPES}
            error={errors.recipientType}
            helperText={template?.isSystem ? COPY.whoForFixed : COPY.whoForHint}
            required
            disabled={readOnly || template?.isSystem}
          />
        </section>
        {isNew ? (
          <section className="wz-tpl-side__section">
            <h3>{COPY.history}</h3>
            <p className="wz-letters__cell-sub">{COPY.historyNew}</p>
          </section>
        ) : (
          tab === "about" && (
            <TemplateHistory template={template} canEdit={!readOnly} hasUnsavedChanges={dirty} onRestored={onTemplateReplaced} />
          )
        )}
        {canReset && (
          <section className="wz-tpl-side__section">
            <p className="wz-letters__cell-sub">{COPY.resetHint}</p>
            <div>
              <Button variant="outline" icon={<RotateCcw size={16} />} onClick={() => setConfirmReset(true)}>
                {COPY.resetToOriginal}
              </Button>
            </div>
          </section>
        )}
      </TabPanel>

      <ConfirmDialog
        open={confirmReset}
        variant="destructive"
        title={COPY.resetTitle}
        message={dirty ? COPY.resetMessageUnsaved : COPY.resetMessage}
        confirmLabel={COPY.reset}
        loading={templateAction.isPending}
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </aside>
  );
});

export default EditorSidePanel;
