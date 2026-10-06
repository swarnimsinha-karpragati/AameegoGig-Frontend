import { useEffect, useRef, useState } from "react";
import { ConfirmDialog, Textarea } from "../../../design-system";
import { validateField } from "../../../utils/inputValidation";
import { LETTERS_COPY } from "../../../utils/lettersCopy";

const COPY = LETTERS_COPY.editor;
export const NOTE_MAX_LENGTH = 200;

/** Asks for an optional change note before saving a new version of a template. */
export default function SaveTemplateDialog({ open, saving = false, error = "", onCancel, onSave }) {
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [serverError, setServerError] = useState(error);
  const noteRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setNote("");
      setNoteError("");
    }
  }, [open]);

  useEffect(() => {
    setServerError(error);
    if (error) noteRef.current?.focus();
  }, [error]);

  const submit = () => {
    const err = validateField({
      name: "note",
      label: COPY.saveNoteLabel,
      value: note,
      kind: "long_text",
      maxLength: NOTE_MAX_LENGTH,
    });
    setNoteError(err || "");
    if (err) {
      noteRef.current?.focus();
      return;
    }
    onSave(note.trim());
  };

  return (
    <ConfirmDialog
      open={open}
      title={COPY.saveTitle}
      confirmLabel={COPY.saveConfirm}
      loading={saving}
      initialFocusRef={noteRef}
      onConfirm={submit}
      onCancel={onCancel}
    >
      <Textarea
        ref={noteRef}
        label={COPY.saveNote}
        name="note"
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          setNoteError("");
          setServerError("");
        }}
        error={noteError || serverError}
        helperText={COPY.saveNoteHint}
        maxLength={NOTE_MAX_LENGTH}
        rows={3}
      />
    </ConfirmDialog>
  );
}
