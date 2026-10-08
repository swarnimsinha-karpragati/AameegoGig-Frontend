import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, FilePlus2, RefreshCw, Save } from "lucide-react";
import { Badge, Button, ConfirmDialog, Input, Spinner } from "../../design-system";
import {
  LETTER_TEMPLATES_KEY,
  useLetterPlaceholders,
  useLetterTemplate,
  useSaveLetterTemplate,
} from "../../hooks/useLetters";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import useUnsavedChangesGuard from "../../hooks/useUnsavedChangesGuard";
import { previewLetterTemplate } from "../../services/letterTemplateService";
import {
  detailLabels,
  draftToPayload,
  editorErrorTarget,
  getApiError,
  isTemplateVersionConflict,
  isDraftDirty,
  questionKeyLocks,
  templateServerError,
  templateToDraft,
  validateTemplateDraft,
} from "../../utils/letterForms";
import { validateField } from "../../utils/inputValidation";
import { detailDisplayName, removeFieldFromHtml, usedFieldKeys } from "../../utils/letterPlaceholders";
import { LETTERS_COPY, format } from "../../utils/lettersCopy";
import { useToast } from "../Toast";
import EditorSidePanel from "./editor/EditorSidePanel";
import SaveTemplateDialog from "./editor/SaveTemplateDialog";
import LetterPreviewFrame from "./LetterPreviewFrame";
import RichTextEditor from "./RichTextEditor";
import "./editor/TemplateEditor.css";

const COPY = LETTERS_COPY.editor;
const MANAGE_COPY = LETTERS_COPY.manage;
const TRY_ISSUING_HINT_ID = "wz-tpl-editor-try-hint";

export default function TemplateEditor({ templateId, canEdit, canIssue, onExit, onSaved, onIssue }) {
  const toast = useToast();
  const isNew = templateId === "new";
  const {
    data: template,
    isLoading,
    error: loadError,
    refetch: refetchTemplate,
  } = useLetterTemplate(isNew ? null : templateId);
  const save = useSaveLetterTemplate();
  const editorRef = useRef(null);
  const nameRef = useRef(null);
  const panelRef = useRef(null);
  const reloadRef = useRef(null);

  const [draft, setDraft] = useState(() => templateToDraft(null));
  const [baseline, setBaseline] = useState(() => templateToDraft(null));
  // The template id and version the draft was loaded from: saves send this version, so the
  // server can detect edits made elsewhere since the draft was opened.
  const [base, setBase] = useState(null);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState("questions");
  const [previewing, setPreviewing] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);
  const [reloadError, setReloadError] = useState("");
  const [removingIndex, setRemovingIndex] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);

  const archived = template?.status === "archived";
  const readOnly = !canEdit || archived;

  const loadTemplate = useCallback((source) => {
    const next = templateToDraft(source);
    setDraft(next);
    setBaseline(next);
    setErrors({});
    setConflict(false);
    setReloadError("");
    setBase(source ? { id: source._id, version: source.version } : { id: "new", version: null });
  }, []);

  const dirty = isDraftDirty(draft, baseline);

  useEffect(() => {
    // A created template keeps its draft until the parent re-mounts the editor on the new id.
    if (isNew) {
      if (base == null) loadTemplate(null);
      return;
    }
    if (!template) return;
    if (base?.id !== template._id) loadTemplate(template);
    // Only a newer server version replaces the draft (a refetch can return an older copy right
    // after a save), and never while there are local edits — saving those reports the conflict.
    else if (template.version > base.version && !dirty) loadTemplate(template);
  }, [isNew, template, base, dirty, loadTemplate]);

  const leaveGuard = useUnsavedChangesGuard(dirty);

  // Runs after dialogs close (their focus restore happens first), so focus lands on the field to fix.
  useEffect(() => {
    if (!focusRequest) return;
    setFocusRequest(null);
    if (focusRequest.field === "name") nameRef.current?.focus();
    else if (focusRequest.field === "bodyHtml") editorRef.current?.focus();
    else if (focusRequest.field === "conflict") reloadRef.current?.focus();
    else panelRef.current?.focusTarget(focusRequest);
  }, [focusRequest]);

  const { data: placeholderGroups = [], isLoading: detailsLoading } = useLetterPlaceholders(draft.recipientType);
  // Chips are named from the details list, so the letter waits for its first load; later reloads
  // (changing who the letter is for) keep the editor mounted so undo history and HTML mode survive.
  const detailsReadyRef = useRef(false);
  if (!detailsLoading) detailsReadyRef.current = true;
  const registryKeys = useMemo(
    () => placeholderGroups.flatMap((group) => group.placeholders.map((item) => item.key)),
    [placeholderGroups]
  );
  const usedKeys = useMemo(() => [...usedFieldKeys(draft.bodyHtml)], [draft.bodyHtml]);
  const keyLocks = useMemo(
    () => questionKeyLocks(draft.inputFields, usedKeys, registryKeys),
    [draft.inputFields, usedKeys, registryKeys]
  );
  const labels = useMemo(() => detailLabels(placeholderGroups, draft.inputFields).labels, [placeholderGroups, draft.inputFields]);

  const previewPayload = useDebouncedValue(
    useMemo(() => draftToPayload(draft), [draft]),
    500
  );
  const preview = useQuery({
    queryKey: [LETTER_TEMPLATES_KEY, "preview", isNew ? "new" : templateId, previewPayload],
    queryFn: () => previewLetterTemplate(isNew ? null : templateId, previewPayload),
    enabled: previewing && Boolean(previewPayload.bodyHtml),
    placeholderData: (previous) => previous,
    retry: false,
  });

  const update = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      Object.keys(patch).forEach((key) => delete next[key]);
      return next;
    });
  };

  const focusError = (target) => {
    if (!target) return;
    if (target.tab) setTab(target.tab);
    if (target.field === "bodyHtml") setPreviewing(false);
    setFocusRequest(target);
  };

  const insertPlaceholder = (key) => {
    if (previewing) setPreviewing(false);
    requestAnimationFrame(() => editorRef.current?.insertPlaceholder(key));
  };

  const requestExit = () => leaveGuard.request(onExit);

  /** Someone else saved first: show the reload notice and move focus to its Reload button. */
  const showConflict = () => {
    setConflict(true);
    setFocusRequest({ field: "conflict" });
  };

  /** Saves the draft; resolves to the saved template, or null when the save failed. */
  const persist = async (note) => {
    try {
      const payload = draftToPayload(draft, { note, version: isNew ? undefined : base?.version });
      const saved = await save.mutateAsync({ id: isNew ? null : templateId, payload });
      toast.success(isNew ? COPY.created : format(COPY.saved, { version: saved?.version ?? "" }));
      setSaveOpen(false);
      loadTemplate(saved);
      if (isNew && saved?._id) onSaved?.(saved._id);
      return saved;
    } catch (error) {
      const apiError = getApiError(error, COPY.saveError);
      if (isTemplateVersionConflict(apiError)) {
        setSaveOpen(false);
        showConflict();
        return null;
      }
      const { errors: mapped, target } = templateServerError(apiError, labels);
      if (mapped.note) {
        setNoteError(mapped.note);
        return null;
      }
      setSaveOpen(false);
      if (target) {
        setErrors((current) => ({ ...current, ...mapped }));
        focusError(target);
      }
      toast.error(target ? COPY.fixErrors : apiError.message);
      return null;
    }
  };

  const draftIsValid = () => {
    const result = validateTemplateDraft(draft, registryKeys);
    if (result.valid) return true;
    setErrors(result.errors);
    focusError(editorErrorTarget(result.errors));
    toast.error(COPY.fixErrors);
    return false;
  };

  const handleSave = () => {
    if (!draftIsValid()) return;
    if (isNew) {
      persist("");
      return;
    }
    setNoteError("");
    setSaveOpen(true);
  };

  const handleTryIssuing = () => {
    if (dirty) setConfirmIssue(true);
    else onIssue?.(templateId);
  };

  const saveAndTryIssuing = async () => {
    setConfirmIssue(false);
    if (!draftIsValid()) return;
    const saved = await persist("");
    if (saved?._id) onIssue?.(saved._id);
  };

  const reloadLatest = async () => {
    setConfirmReload(false);
    setReloadError("");
    const latest = await refetchTemplate();
    if (latest.isError || !latest.data) {
      setReloadError(COPY.reloadError);
      return;
    }
    loadTemplate(latest.data);
  };

  const requestReload = () => {
    if (dirty) setConfirmReload(true);
    else reloadLatest();
  };

  const requestRemoveQuestion = (index) => {
    const field = draft.inputFields[index];
    if (field?.key && usedKeys.includes(field.key)) setRemovingIndex(index);
    else update({ inputFields: draft.inputFields.filter((_, i) => i !== index) });
  };

  const removeUsedQuestion = () => {
    const field = draft.inputFields[removingIndex];
    setRemovingIndex(null);
    if (!field) return;
    update({
      inputFields: draft.inputFields.filter((_, i) => i !== removingIndex),
      bodyHtml: removeFieldFromHtml(draft.bodyHtml, field.key),
    });
  };
  const removingField = removingIndex == null ? null : draft.inputFields[removingIndex];

  if (!isNew && isLoading) {
    return (
      <div className="wz-preview__state">
        <Spinner /> {COPY.loading}
      </div>
    );
  }

  // A failed background refetch keeps the loaded template, so only a failed first load shows this.
  if (!isNew && !template) {
    return (
      <div className="wz-letters__section">
        <p className="wz-letters__notice wz-letters__notice--error" role="alert">
          {getApiError(loadError, COPY.notFound).message}
        </p>
        <div>
          <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={onExit}>
            {COPY.back}
          </Button>
        </div>
      </div>
    );
  }

  const missing = (preview.data?.missing || []).map((key) => detailDisplayName(key, labels));

  return (
    <div className="wz-tpl-editor">
      <div className="wz-tpl-editor__bar">
        <div className="wz-tpl-editor__title">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} aria-label={COPY.back} onClick={requestExit} />
          <Input
            ref={nameRef}
            className="wz-tpl-editor__name"
            aria-label={COPY.nameLabel}
            name="name"
            value={draft.name}
            placeholder={COPY.newTemplate}
            onChange={(event) => update({ name: event.target.value })}
            onBlur={() => {
              const err = validateField({ name: "name", label: COPY.nameLabel, value: draft.name, kind: "display_name", required: true });
              if (err) setErrors((current) => ({ ...current, name: err }));
            }}
            error={errors.name}
            required
            disabled={readOnly}
            maxLength={100}
          />
          {template?.isSystem && (
            <Badge tone={template.isCustomised ? "info" : "brand"}>
              {template.isCustomised ? MANAGE_COPY.badgeCustomised : MANAGE_COPY.badgeDefault}
            </Badge>
          )}
          {archived && <Badge tone="warning">{MANAGE_COPY.badgeArchived}</Badge>}
          {dirty && <Badge tone="warning">{COPY.unsaved}</Badge>}
        </div>
        <div className="wz-tpl-editor__actions">
          <Button
            variant="ghost"
            icon={<Eye size={16} />}
            aria-pressed={previewing}
            onClick={() => setPreviewing((current) => !current)}
          >
            {COPY.previewSample}
          </Button>
          {canIssue && !archived && (
            <Button
              variant="outline"
              icon={<FilePlus2 size={16} />}
              disabled={isNew}
              aria-describedby={isNew ? TRY_ISSUING_HINT_ID : undefined}
              loading={save.isPending && !saveOpen && !isNew}
              onClick={handleTryIssuing}
            >
              {COPY.tryIssuing}
            </Button>
          )}
          {!readOnly && (
            <Button icon={<Save size={16} />} onClick={handleSave} loading={save.isPending && !saveOpen} disabled={!dirty && !isNew}>
              {isNew ? COPY.create : COPY.save}
            </Button>
          )}
        </div>
        {canIssue && isNew && (
          <p id={TRY_ISSUING_HINT_ID} className="wz-tpl-editor__hint">
            {COPY.tryIssuingNew}
          </p>
        )}
      </div>

      {conflict && (
        <div className="wz-letters__notice wz-letters__notice--warning wz-tpl-editor__conflict" role="alert">
          <span>{COPY.conflict}</span>
          <Button ref={reloadRef} variant="secondary" size="sm" icon={<RefreshCw size={16} />} onClick={requestReload}>
            {COPY.reload}
          </Button>
          {reloadError && <span className="wz-tpl-editor__conflict-error">{reloadError}</span>}
        </div>
      )}
      {archived && <p className="wz-letters__notice wz-letters__notice--warning">{COPY.archivedNotice}</p>}
      {!canEdit && !archived && <p className="wz-letters__notice">{COPY.readOnlyNotice}</p>}

      <div className="wz-tpl-editor__grid">
        <section className="wz-tpl-editor__canvas" aria-label={COPY.canvasLabel}>
          {previewing && (
            <>
              {missing.length > 0 && (
                <p className="wz-letters__notice wz-letters__notice--warning">
                  {format(COPY.previewMissing, { list: missing.join(", ") })}
                </p>
              )}
              <LetterPreviewFrame
                html={preview.data?.html}
                loading={preview.isFetching}
                error={preview.isError ? getApiError(preview.error, COPY.previewError).message : ""}
                emptyText={COPY.previewEmpty}
                title={COPY.previewTitle}
              />
            </>
          )}
          {/* Hidden rather than unmounted so HTML mode, the cursor and undo history survive the preview. */}
          <div hidden={previewing}>
            {detailsReadyRef.current ? (
              <RichTextEditor
                ref={editorRef}
                value={draft.bodyHtml}
                onChange={(bodyHtml) => update({ bodyHtml })}
                error={errors.bodyHtml}
                disabled={readOnly}
                detailGroups={placeholderGroups}
                questionFields={draft.inputFields}
              />
            ) : (
              <div className="wz-preview__state">
                <Spinner /> {COPY.loadingDetails}
              </div>
            )}
          </div>
        </section>

        <EditorSidePanel
          ref={panelRef}
          tab={tab}
          onTabChange={setTab}
          draft={draft}
          errors={errors}
          readOnly={readOnly}
          template={template}
          isNew={isNew}
          dirty={dirty}
          onUpdate={update}
          onInsert={insertPlaceholder}
          keyLocks={keyLocks}
          onRemoveQuestion={requestRemoveQuestion}
          onTemplateReplaced={loadTemplate}
          editingVersion={base?.version}
          onVersionConflict={showConflict}
        />
      </div>

      <SaveTemplateDialog
        open={saveOpen}
        saving={save.isPending}
        error={noteError}
        onCancel={() => setSaveOpen(false)}
        onSave={persist}
      />
      <ConfirmDialog
        open={leaveGuard.confirmOpen}
        variant="destructive"
        title={COPY.discardTitle}
        message={COPY.discardMessage}
        confirmLabel={COPY.discard}
        cancelLabel={COPY.keepEditing}
        onConfirm={leaveGuard.confirm}
        onCancel={leaveGuard.cancel}
      />
      <ConfirmDialog
        open={confirmIssue}
        title={COPY.tryIssuingConfirmTitle}
        message={COPY.tryIssuingConfirmMessage}
        confirmLabel={COPY.saveAndTryIssuing}
        cancelLabel={COPY.keepEditing}
        onConfirm={saveAndTryIssuing}
        onCancel={() => setConfirmIssue(false)}
      />
      <ConfirmDialog
        open={confirmReload}
        variant="destructive"
        title={COPY.reloadConfirmTitle}
        message={COPY.reloadConfirmMessage}
        confirmLabel={COPY.reload}
        cancelLabel={COPY.keepEditing}
        onConfirm={reloadLatest}
        onCancel={() => setConfirmReload(false)}
      />
      <ConfirmDialog
        open={Boolean(removingField)}
        variant="destructive"
        title={format(COPY.removeUsedQuestionTitle, {
          label: String(removingField?.label || "").trim() || detailDisplayName(removingField?.key, labels),
        })}
        message={COPY.removeUsedQuestionMessage}
        confirmLabel={COPY.removeUsedQuestionConfirm}
        cancelLabel={COPY.keepEditing}
        onConfirm={removeUsedQuestion}
        onCancel={() => setRemovingIndex(null)}
      />
    </div>
  );
}
