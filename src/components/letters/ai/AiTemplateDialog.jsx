import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ConfirmDialog, Input, Select, Textarea } from "../../../design-system";
import { draftTemplateWithAi, importWordTemplate } from "../../../services/letterAiService";
import { RECIPIENT_TYPES, getApiError } from "../../../utils/letterForms";
import { LETTERS_COPY } from "../../../utils/lettersCopy";

const AI = LETTERS_COPY.ai;

/**
 * Start with AI (mode "draft") or Import from Word (mode "import"). On success calls
 * onDrafted({ template, notes, replacements, fileName }) with an unsaved draft for the editor.
 */
export default function AiTemplateDialog({ mode, onDrafted, onCancel }) {
  const isImport = mode === "import";
  const [recipientType, setRecipientType] = useState("employee");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const request = useMutation({
    mutationFn: () => (isImport ? importWordTemplate({ file, recipientType }) : draftTemplateWithAi({ description, recipientType })),
  });

  const submit = async () => {
    if (isImport && !file) {
      setError(AI.importFileRequired);
      return;
    }
    if (!isImport && description.trim().length < 10) {
      setError(AI.draftDescriptionHint);
      return;
    }
    try {
      const result = await request.mutateAsync();
      onDrafted({ ...result, fileName: isImport ? file.name : "" });
    } catch (err) {
      setError(getApiError(err, AI.error).message);
    }
  };

  return (
    <ConfirmDialog
      open
      title={isImport ? AI.importTitle : AI.draftTitle}
      message={isImport ? AI.importNotice : undefined}
      confirmLabel={isImport ? AI.importAction : AI.draftCreate}
      loading={request.isPending}
      onConfirm={submit}
      onCancel={onCancel}
    >
      <Select
        label={AI.draftWhoFor}
        name="aiRecipientType"
        value={recipientType}
        options={RECIPIENT_TYPES}
        onChange={(event) => setRecipientType(event.target.value)}
        disabled={request.isPending}
      />
      {isImport ? (
        <Input
          type="file"
          label={AI.importFileLabel}
          name="aiImportFile"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setError("");
          }}
          error={error}
          disabled={request.isPending}
          required
        />
      ) : (
        <Textarea
          label={AI.draftDescriptionLabel}
          name="aiDescription"
          value={description}
          helperText={error ? undefined : AI.draftDescriptionHint}
          error={error}
          rows={4}
          maxLength={1500}
          onChange={(event) => {
            setDescription(event.target.value);
            setError("");
          }}
          disabled={request.isPending}
          required
        />
      )}
    </ConfirmDialog>
  );
}
