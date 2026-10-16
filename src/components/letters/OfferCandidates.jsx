import { useEffect, useState } from "react";
import { Clock, FileText, PencilLine, Plus, Trash2, Users, XCircle } from "lucide-react";
import { Badge, Button, ConfirmDialog, DataTable, DataToolbar, EmptyState, Pagination, Select, Textarea, cx } from "../../design-system";
import { useOfferCandidateAction, useOfferCandidates } from "../../hooks/useLetters";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import useFocusOnMount from "../../hooks/useFocusOnMount";
import { STATUS_NOTE_FIELD, formatLetterDate, validateStatusNote } from "../../utils/letterForms";
import { LETTERS_COPY, format } from "../../utils/lettersCopy";
import { STATUS_OPTIONS, getOfferNextStep, offerActionError } from "../../utils/offerNextStep";
import { useToast } from "../Toast";
import CandidateDrawer from "./CandidateDrawer";
import "./OfferCandidates.css";

const COPY = LETTERS_COPY.offers;
const PAGE_SIZE = 20;

const MARK_STATUS = { "mark-accepted": "accepted", "mark-declined": "declined", "mark-expired": "expired" };

const MENU_ICONS = {
  edit: <PencilLine size={16} />,
  "view-letters": <FileText size={16} />,
  "mark-declined": <XCircle size={16} />,
  "mark-expired": <Clock size={16} />,
  delete: <Trash2 size={16} />,
};

const formatCtc = (value) =>
  Number(value) > 0
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value))
    : "—";

function OfferProgress({ steps, text }) {
  return (
    <>
      <span className="wz-sr-only">{text}</span>
      <ol className="wz-offer-progress" aria-hidden="true">
        {steps.map((step) => (
          <li
            key={step.status}
            className={cx("wz-offer-progress__step", `is-${step.state}`, step.tone && `wz-offer-progress__step--${step.tone}`)}
          >
            <span className="wz-offer-progress__dot" />
            {step.label}
          </li>
        ))}
      </ol>
    </>
  );
}

export default function OfferCandidates({
  canManage,
  canIssue,
  focusHeading = false,
  onSendOffer,
  onViewLetters,
  onConvert,
  onViewEmployee,
}) {
  const headingRef = useFocusOnMount(focusHeading);
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState({ open: false, candidate: null });
  const [dialog, setDialog] = useState(null);

  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  useEffect(() => setPage(1), [debouncedSearch, status]);

  const { data, isLoading, isError, refetch } = useOfferCandidates({
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status ? { status } : {}),
  });
  const candidates = data?.candidates || [];
  const pagination = data?.pagination;
  const action = useOfferCandidateAction();

  const permissions = { canManage, canIssue };
  const stepFor = (candidate) => getOfferNextStep(candidate, permissions);

  const openDrawer = (candidate) => setDrawer({ open: true, candidate });

  const handlers = {
    "send-offer": (candidate) => onSendOffer(candidate),
    "add-employee": (candidate) => onConvert(candidate),
    "view-employee": (candidate) => onViewEmployee(candidate),
    "view-letters": (candidate) => onViewLetters(candidate),
    edit: openDrawer,
    delete: (candidate) => setDialog({ type: "delete", candidate }),
  };

  const runAction = (id, candidate) => {
    if (MARK_STATUS[id]) setDialog({ type: "status", candidate, status: MARK_STATUS[id], note: "", noteError: null });
    else handlers[id]?.(candidate);
  };

  const setNote = (event) => {
    const note = event.target.value;
    setDialog((current) => current && { ...current, note, noteError: current.noteError ? validateStatusNote(note) : null });
  };

  const confirm = async () => {
    const { type, candidate } = dialog;
    const name = candidate.name;
    const note = type === "status" ? dialog.note.trim() : "";
    if (type === "status") {
      const noteError = validateStatusNote(note);
      if (noteError) {
        setDialog((current) => current && { ...current, noteError });
        return;
      }
    }
    setDialog((current) => current && { ...current, error: null });
    try {
      if (type === "status") {
        await action.mutateAsync({ action: "status", id: candidate._id, value: dialog.status, note });
        toast.success(format(COPY.confirm[dialog.status].done, { name }));
      } else {
        await action.mutateAsync({ action: "delete", id: candidate._id });
        toast.success(format(COPY.deleted, { name }));
      }
      setDialog(null);
    } catch (error) {
      const failure = offerActionError(error, { name });
      if (failure.refresh) refetch();
      if (failure.stale) {
        toast.error(failure.message);
        setDialog(null);
        return;
      }
      if (type === "status" && failure.field === STATUS_NOTE_FIELD.name) {
        setDialog((current) => current && { ...current, noteError: failure.message });
        return;
      }
      setDialog((current) => current && { ...current, error: failure });
    }
  };

  const rowActions = (candidate) =>
    stepFor(candidate).menu.map((item) => ({
      label: item.label,
      icon: MENU_ICONS[item.id],
      danger: item.danger,
      onClick: () => runAction(item.id, candidate),
    }));

  const columns = [
    {
      key: "name",
      header: COPY.columns.candidate,
      render: (c) => (
        <span className="wz-letters__cell-main">
          <span className="wz-letters__cell-title">{c.name}</span>
          <span className="wz-letters__cell-sub">{c.email || COPY.noEmail}</span>
        </span>
      ),
    },
    {
      key: "designation",
      header: COPY.columns.role,
      render: (c) => (
        <span className="wz-letters__cell-main">
          <span>{c.designation || "—"}</span>
          {c.departmentName && <span className="wz-letters__cell-sub">{c.departmentName}</span>}
        </span>
      ),
    },
    { key: "annualCTC", header: COPY.columns.ctc, align: "right", render: (c) => formatCtc(c.annualCTC) },
    {
      key: "joiningDate",
      header: COPY.columns.joining,
      render: (c) => (
        <span className="wz-letters__cell-main">
          <span>{formatLetterDate(c.joiningDate)}</span>
          {c.offerExpiryDate && (
            <span className="wz-letters__cell-sub">{format(COPY.offerValidTill, { date: formatLetterDate(c.offerExpiryDate) })}</span>
          )}
        </span>
      ),
    },
    {
      key: "status",
      header: COPY.columns.status,
      render: (c) => {
        const step = stepFor(c);
        return (
          <span className="wz-offer-status">
            <Badge tone={step.tone}>{step.label}</Badge>
            <OfferProgress steps={step.progressSteps} text={step.progressText} />
          </span>
        );
      },
    },
    {
      key: "nextStep",
      header: COPY.columns.nextStep,
      render: (c) => {
        const { nextStep: next, notice } = stepFor(c);
        if (!next) return notice ? <span className="wz-letters__cell-sub">{notice}</span> : null;
        return (
          <Button
            size="sm"
            variant={next.id === "view-employee" ? "secondary" : "primary"}
            aria-label={format(COPY.nextStepFor, { action: next.label, name: c.name })}
            onClick={(event) => {
              event.stopPropagation();
              runAction(next.id, c);
            }}
          >
            {next.label}
          </Button>
        );
      },
    },
  ];

  const hasFilters = Boolean(debouncedSearch || status);
  const addButton = (
    <Button icon={<Plus size={16} />} onClick={() => openDrawer(null)}>
      {COPY.addCandidate}
    </Button>
  );

  const dialogCandidate = dialog?.candidate;
  const dialogName = dialogCandidate?.name;
  const statusCopy = dialog?.type === "status" ? COPY.confirm[dialog.status] : null;

  return (
    <section className="wz-letters__section" aria-labelledby="letters-offers-title">
      <div className="wz-letters__section-head">
        <div>
          <h2 id="letters-offers-title" ref={headingRef} tabIndex={-1} className="wz-letters__section-title">
            {COPY.title}
          </h2>
          <p className="wz-letters__section-desc">{COPY.description}</p>
        </div>
        {canManage && addButton}
      </div>

      <DataToolbar
        search={{ value: search, onChange: setSearch, placeholder: COPY.searchPlaceholder, ariaLabel: COPY.searchLabel }}
        filters={
          <Select
            className="wz-letters__filter"
            label={COPY.statusFilter}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            placeholder={COPY.anyStatus}
            options={STATUS_OPTIONS}
          />
        }
      />

      {isError ? (
        <EmptyState
          icon={<Users />}
          title={COPY.loadError}
          description={COPY.loadErrorHint}
          action={<Button variant="secondary" onClick={() => refetch()}>{COPY.retry}</Button>}
        />
      ) : (
        <>
          <DataTable
            caption={COPY.caption}
            columns={columns}
            rows={candidates}
            rowKey="_id"
            loading={isLoading}
            rowActions={rowActions}
            getRowLabel={(c) => c.name}
            onRowClick={canManage ? openDrawer : undefined}
            emptyState={
              <EmptyState
                icon={<Users />}
                title={hasFilters ? COPY.noMatch : COPY.emptyTitle}
                description={hasFilters ? COPY.noMatchHint : canManage ? COPY.emptyHint : COPY.emptyHintReadOnly}
                action={!hasFilters && canManage ? addButton : null}
              />
            }
          />
          {pagination && pagination.totalPages > 1 && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setPage}
              summaryLabel="candidates"
            />
          )}
        </>
      )}

      <CandidateDrawer open={drawer.open} candidate={drawer.candidate} onClose={() => setDrawer({ open: false, candidate: null })} />
      <ConfirmDialog
        open={Boolean(dialog)}
        variant={dialog?.type === "delete" ? "destructive" : "standard"}
        title={format(statusCopy ? statusCopy.title : COPY.deleteTitle, { name: dialogName })}
        message={format(statusCopy ? statusCopy.message : COPY.deleteMessage, { name: dialogName })}
        confirmLabel={statusCopy ? statusCopy.confirm : COPY.deleteConfirm}
        cancelLabel={COPY.cancel}
        loading={action.isPending}
        confirmDisabled={dialog?.error?.code === "CANDIDATE_IN_USE"}
        onConfirm={confirm}
        onCancel={() => setDialog(null)}
      >
        {statusCopy && (
          <Textarea
            className="wz-offer-dialog__note"
            name={STATUS_NOTE_FIELD.name}
            label={COPY.noteLabel}
            value={dialog.note}
            onChange={setNote}
            onBlur={() => setDialog((current) => current && { ...current, noteError: validateStatusNote(current.note) })}
            error={dialog.noteError || undefined}
            helperText={COPY.noteHint}
            rows={3}
            maxLength={STATUS_NOTE_FIELD.maxLength}
          />
        )}
        {dialog?.error && (
          <div role="alert" className="wz-offer-dialog__error">
            {dialog.error.message}
            {dialog.error.code === "CANDIDATE_IN_USE" && (
              <div className="wz-offer-dialog__error-action">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDialog(null);
                    onViewLetters(dialogCandidate);
                  }}
                >
                  {COPY.actions.viewLetters}
                </Button>
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}
