import { useEffect, useMemo, useState } from "react";
import { Button, Drawer, Input, Select, Textarea } from "../../design-system";
import { useDepartmentNames } from "../../hooks/useDepartments";
import { useOfferCandidate, useSaveOfferCandidate } from "../../hooks/useLetters";
import { validateField } from "../../utils/inputValidation";
import { CANDIDATE_FIELDS, EMPTY_CANDIDATE, formatLetterDate, getApiError, validateCandidate } from "../../utils/letterForms";
import { LETTERS_COPY, format } from "../../utils/lettersCopy";
import { STATUS_LABELS } from "../../utils/offerNextStep";
import { useToast } from "../Toast";
import "./OfferCandidates.css";

const currentVendorId = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")?.vendorId || "";
  } catch {
    return "";
  }
};

const toDateInput = (value) => (value ? String(value).slice(0, 10) : "");

const candidateToForm = (candidate) =>
  candidate
    ? {
        ...EMPTY_CANDIDATE,
        ...Object.fromEntries(Object.keys(EMPTY_CANDIDATE).map((key) => [key, candidate[key] ?? ""])),
        departmentId: candidate.departmentId?._id || candidate.departmentId || "",
        annualCTC: candidate.annualCTC ? String(candidate.annualCTC) : "",
        joiningDate: toDateInput(candidate.joiningDate),
        offerExpiryDate: toDateInput(candidate.offerExpiryDate),
      }
    : { ...EMPTY_CANDIDATE };

const COPY = LETTERS_COPY.offers.drawer;
const HISTORY_COPY = LETTERS_COPY.offers.history;

function StatusHistory({ candidateId, open }) {
  const { data, isLoading, isError, refetch } = useOfferCandidate(candidateId, { enabled: open });
  const newestFirst = [...(data?.statusHistory || [])].reverse();
  let body;
  if (isLoading) body = <p className="wz-candidate-history__empty">{HISTORY_COPY.loading}</p>;
  else if (isError) {
    body = (
      <p className="wz-candidate-history__empty">
        {HISTORY_COPY.error}{" "}
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          {HISTORY_COPY.retry}
        </Button>
      </p>
    );
  } else if (newestFirst.length === 0) body = <p className="wz-candidate-history__empty">{HISTORY_COPY.empty}</p>;
  return (
    <section className="wz-candidate-history is-full" aria-labelledby="candidate-history-title">
      <h3 id="candidate-history-title" className="wz-candidate-history__title">
        {HISTORY_COPY.title}
      </h3>
      {body || (
        <ol className="wz-candidate-history__list">
          {newestFirst.map((entry, index) => (
            <li key={`${entry.status}-${entry.changedAt}-${index}`} className="wz-candidate-history__item">
              <span className="wz-candidate-history__status">{STATUS_LABELS[entry.status] || entry.status}</span>
              <span className="wz-candidate-history__meta">
                <time dateTime={entry.changedAt}>{formatLetterDate(entry.changedAt)}</time>
                {entry.changedByName && <span> · {format(HISTORY_COPY.by, { name: entry.changedByName })}</span>}
              </span>
              {entry.note && <p className="wz-candidate-history__note">{entry.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const FIELD_BY_NAME = Object.fromEntries(CANDIDATE_FIELDS.map((field) => [field.name, field]));

export default function CandidateDrawer({ open, candidate, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !candidate?._id;
  const readOnly = candidate?.status === "converted";
  const save = useSaveOfferCandidate();
  const { data: departments = [] } = useDepartmentNames(currentVendorId(), { enabled: open });
  const [form, setForm] = useState(() => candidateToForm(candidate));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(candidateToForm(candidate));
      setErrors({});
    }
  }, [open, candidate]);

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d._id, label: d.name })),
    [departments]
  );

  const set = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const blur = (name) => () => {
    const field = FIELD_BY_NAME[name];
    if (!field) return;
    const err = validateField({ ...field, value: form[name] });
    setErrors((current) => ({ ...current, [name]: err || undefined }));
  };

  const handleSave = async () => {
    const result = validateCandidate(form, { isNew });
    setErrors(result.errors);
    if (!result.valid) {
      toast.error(COPY.fixFields);
      return;
    }
    const payload = {
      ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])),
      annualCTC: Number(form.annualCTC),
      departmentId: form.departmentId || null,
      offerExpiryDate: form.offerExpiryDate || null,
    };
    try {
      const saved = await save.mutateAsync({ id: isNew ? null : candidate._id, payload });
      toast.success(isNew ? COPY.added : COPY.updated);
      onSaved?.(saved);
      onClose();
    } catch (error) {
      const apiError = getApiError(error, COPY.saveError);
      if (apiError.field && FIELD_BY_NAME[apiError.field]) {
        setErrors((current) => ({ ...current, [apiError.field]: apiError.message }));
      }
      toast.error(apiError.message);
    }
  };

  const fieldProps = (name, extra = {}) => ({
    name,
    label: FIELD_BY_NAME[name]?.label,
    value: form[name],
    onChange: set(name),
    onBlur: blur(name),
    error: errors[name],
    required: Boolean(FIELD_BY_NAME[name]?.required),
    disabled: readOnly,
    ...extra,
  });

  return (
    <Drawer
      open={open}
      onClose={() => !save.isPending && onClose()}
      title={isNew ? COPY.addTitle : readOnly ? candidate.name : COPY.editTitle}
      subtitle={readOnly ? COPY.joinedSubtitle : COPY.subtitle}
      width={600}
      footer={
        <div className="wz-letters__drawer-footer">
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            {readOnly ? COPY.close : COPY.cancel}
          </Button>
          {!readOnly && (
            <Button onClick={handleSave} loading={save.isPending}>
              {isNew ? COPY.add : COPY.save}
            </Button>
          )}
        </div>
      }
    >
      <div className="wz-form-grid">
        <Input {...fieldProps("name", { maxLength: 100, autoComplete: "off" })} className="is-full" />
        <Input {...fieldProps("email", { type: "email", maxLength: 254 })} />
        <Input {...fieldProps("phone", { type: "tel", maxLength: 10, inputMode: "numeric" })} />
        <Input {...fieldProps("designation", { maxLength: 100 })} />
        <Select
          name="departmentId"
          label={COPY.department}
          value={form.departmentId}
          onChange={set("departmentId")}
          options={departmentOptions}
          placeholder={COPY.departmentNone}
          disabled={readOnly}
        />
        <Input {...fieldProps("annualCTC", { type: "number", min: 0, step: "any", inputMode: "decimal" })} />
        <Input {...fieldProps("joiningDate", { type: "date" })} />
        <Input
          {...fieldProps("offerExpiryDate", { type: "date" })}
          helperText={COPY.offerValidHint}
        />
        <Textarea {...fieldProps("address", { rows: 2, maxLength: 500 })} className="is-full" />
        <Textarea {...fieldProps("notes", { rows: 3, maxLength: 1000 })} helperText={COPY.notesHint} className="is-full" />
        {!isNew && <StatusHistory candidateId={candidate._id} open={open} />}
      </div>
    </Drawer>
  );
}
