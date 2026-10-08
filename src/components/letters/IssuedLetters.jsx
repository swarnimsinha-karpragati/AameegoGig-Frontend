import { useEffect, useState } from "react";
import { Ban, Download, Eye, FileCheck2, FilePenLine, FilePlus2, Mail, X } from "lucide-react";
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DataToolbar,
  Drawer,
  EmptyState,
  Pagination,
  Select,
  Spinner,
  Textarea,
} from "../../design-system";
import { useIssuedLetterAction, useIssuedLetters, useLetterTemplates } from "../../hooks/useLetters";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import useFocusOnMount from "../../hooks/useFocusOnMount";
import { downloadIssuedLetter, fetchIssuedLetterPdf } from "../../services/letterService";
import { validateField } from "../../utils/inputValidation";
import {
  LETTER_STATUS_META,
  RECIPIENT_TYPES,
  formatLetterDate,
  getApiError,
  issuedLetterFileName,
  recipientTypeLabel,
} from "../../utils/letterForms";
import { LETTERS_COPY, format } from "../../utils/lettersCopy";
import { useToast } from "../Toast";

const COPY = LETTERS_COPY.issued;
const PAGE_SIZE = 20;

const STATUS_OPTIONS = Object.entries(LETTER_STATUS_META).map(([value, meta]) => ({ value, label: meta.label }));

function PdfViewer({ letter, onClose, onDownload }) {
  const [state, setState] = useState({ url: "", error: "" });

  useEffect(() => {
    if (!letter) return undefined;
    let url = "";
    let cancelled = false;
    setState({ url: "", error: "" });
    fetchIssuedLetterPdf(letter._id)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setState({ url, error: "" });
      })
      .catch((error) => {
        if (!cancelled) setState({ url: "", error: getApiError(error, COPY.openError).message });
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [letter]);

  return (
    <Drawer
      open={Boolean(letter)}
      onClose={onClose}
      title={letter?.templateName || COPY.viewerFallbackTitle}
      subtitle={letter ? format(COPY.viewerSubtitle, { name: letter.recipientName, number: letter.letterNumber }) : ""}
      width={880}
      footer={
        <Button icon={<Download size={16} />} onClick={() => onDownload(letter)}>
          {COPY.download}
        </Button>
      }
    >
      {letter?.status === "void" && (
        <p className="wz-letters__notice wz-letters__notice--error">
          {letter.voidedAt ? format(COPY.viewerVoidedOn, { date: formatLetterDate(letter.voidedAt) }) : COPY.viewerVoided}
          {letter.voidReason ? `: ${letter.voidReason}` : ""}
        </p>
      )}
      {state.error && (
        <p className="wz-letters__notice wz-letters__notice--error" role="alert">
          {state.error}
        </p>
      )}
      {!state.url && !state.error && (
        <div className="wz-preview__state">
          <Spinner /> {COPY.opening}
        </div>
      )}
      {state.url && <iframe className="wz-preview__pdf" title={COPY.pdfTitle} src={state.url} />}
    </Drawer>
  );
}

export default function IssuedLetters({ canIssue, recipientFilter, focusHeading = false, onClearRecipientFilter, onIssue, onReissue }) {
  const headingRef = useFocusOnMount(focusHeading);
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [status, setStatus] = useState("");
  const [recipientType, setRecipientType] = useState("");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState("");

  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  useEffect(() => setPage(1), [debouncedSearch, templateKey, status, recipientType, recipientFilter?.id]);
  const recipientParam = recipientFilter?.id
    ? { [recipientFilter.type === "candidate" ? "candidateId" : "employeeId"]: recipientFilter.id }
    : {};

  const params = {
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(templateKey ? { templateKey } : {}),
    ...(status ? { status } : {}),
    ...(recipientType ? { recipientType } : {}),
    ...recipientParam,
  };
  const { data, isLoading, isError, refetch } = useIssuedLetters(params);
  const letters = data?.letters || [];
  const pagination = data?.pagination;
  const { data: templates = [] } = useLetterTemplates({ status: "all" });
  const action = useIssuedLetterAction();

  const templateOptions = Array.from(new Map(templates.map((t) => [t.key, { value: t.key, label: t.name }])).values());

  const download = async (letter) => {
    try {
      await downloadIssuedLetter(letter._id, issuedLetterFileName(letter));
    } catch (error) {
      toast.error(getApiError(error, COPY.downloadError).message);
    }
  };

  const sendEmail = async () => {
    try {
      await action.mutateAsync({ action: "email", id: dialog.letter._id });
      toast.success(format(COPY.emailedToast, { email: dialog.letter.recipientEmail }));
      setDialog(null);
    } catch (error) {
      toast.error(getApiError(error, COPY.emailError).message);
    }
  };

  const confirmVoid = async () => {
    const err = validateField({ name: "voidReason", label: COPY.voidReason, value: voidReason, kind: "long_text", required: true, maxLength: 500 });
    if (err) {
      setVoidError(err);
      return;
    }
    try {
      await action.mutateAsync({ action: "void", id: dialog.letter._id, reason: voidReason.trim() });
      toast.success(COPY.voided);
      setDialog(null);
    } catch (error) {
      toast.error(getApiError(error, COPY.voidError).message);
    }
  };

  const rowActions = (letter) => {
    const actions = [
      { label: COPY.view, icon: <Eye size={16} />, onClick: () => setViewing(letter) },
      { label: COPY.download, icon: <Download size={16} />, onClick: () => download(letter) },
    ];
    if (canIssue && letter.status !== "void") {
      actions.push({
        label: letter.recipientEmail ? COPY.emailAction : COPY.emailActionDisabled,
        icon: <Mail size={16} />,
        disabled: !letter.recipientEmail,
        onClick: () => setDialog({ type: "email", letter }),
      });
      if (onReissue && letter.templateId) {
        actions.push({ label: COPY.reissueAction, icon: <FilePenLine size={16} />, onClick: () => onReissue(letter) });
      }
      actions.push({
        label: COPY.voidAction,
        icon: <Ban size={16} />,
        danger: true,
        onClick: () => {
          setVoidReason("");
          setVoidError("");
          setDialog({ type: "void", letter });
        },
      });
    }
    return actions;
  };

  const columns = [
    {
      key: "letterNumber",
      header: COPY.columns.letter,
      render: (l) => (
        <span className="wz-letters__cell-main">
          <span className="wz-letters__cell-title">{l.templateName}</span>
          <span className="wz-letters__cell-sub">{l.letterNumber}</span>
        </span>
      ),
    },
    {
      key: "recipientName",
      header: COPY.columns.person,
      render: (l) => (
        <span className="wz-letters__cell-main">
          <span>{l.recipientName}</span>
          <span className="wz-letters__cell-sub">
            {recipientTypeLabel(l.recipientType)}
            {l.recipientEmail ? ` · ${l.recipientEmail}` : ""}
          </span>
        </span>
      ),
    },
    {
      key: "issuedAt",
      header: COPY.columns.issued,
      render: (l) => (
        <span className="wz-letters__cell-main">
          <span>{formatLetterDate(l.issuedAt)}</span>
          {l.issuedByName && <span className="wz-letters__cell-sub">{format(COPY.issuedBy, { name: l.issuedByName })}</span>}
        </span>
      ),
    },
    {
      key: "status",
      header: COPY.columns.status,
      render: (l) => (
        <span className="wz-letters__badges">
          <Badge tone={LETTER_STATUS_META[l.status]?.tone || "neutral"}>{LETTER_STATUS_META[l.status]?.label || l.status}</Badge>
          {l.isEdited && <Badge tone="info">{COPY.edited}</Badge>}
          {l.emailedAt && <Badge tone="neutral">{COPY.emailed}</Badge>}
        </span>
      ),
    },
  ];

  const hasFilters = Boolean(debouncedSearch || templateKey || status || recipientType || recipientFilter?.id);

  return (
    <section className="wz-letters__section" aria-labelledby="letters-issued-title">
      <div className="wz-letters__section-head">
        <div>
          <h2 id="letters-issued-title" ref={headingRef} tabIndex={-1} className="wz-letters__section-title">
            {COPY.title}
          </h2>
          <p className="wz-letters__section-desc">{COPY.description}</p>
        </div>
        {canIssue && (
          <Button icon={<FilePlus2 size={16} />} onClick={() => onIssue()}>
            {COPY.issueButton}
          </Button>
        )}
      </div>

      {recipientFilter?.id && (
        <p className="wz-letters__notice">
          {COPY.showingFor} <strong>{recipientFilter.name || COPY.selectedPerson}</strong>{" "}
          <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={onClearRecipientFilter}>
            {COPY.showAll}
          </Button>
        </p>
      )}

      <DataToolbar
        search={{ value: search, onChange: setSearch, placeholder: COPY.searchPlaceholder, ariaLabel: COPY.searchLabel }}
        filters={
          <>
            <Select
              className="wz-letters__filter"
              label={COPY.templateFilter}
              value={templateKey}
              onChange={(event) => setTemplateKey(event.target.value)}
              placeholder={COPY.allTemplates}
              options={templateOptions}
            />
            <Select
              className="wz-letters__filter"
              label={COPY.personFilter}
              value={recipientType}
              onChange={(event) => setRecipientType(event.target.value)}
              placeholder={COPY.everyone}
              options={RECIPIENT_TYPES}
            />
            <Select
              className="wz-letters__filter"
              label={COPY.statusFilter}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              placeholder={COPY.anyStatus}
              options={STATUS_OPTIONS}
            />
          </>
        }
      />

      {isError ? (
        <EmptyState
          icon={<FileCheck2 />}
          title={COPY.loadError}
          description={COPY.loadErrorHint}
          action={<Button variant="secondary" onClick={() => refetch()}>{COPY.retry}</Button>}
        />
      ) : (
        <>
          <DataTable
            caption={COPY.caption}
            columns={columns}
            rows={letters}
            rowKey="_id"
            loading={isLoading}
            rowActions={rowActions}
            getRowLabel={(l) => [l.letterNumber, l.recipientName].filter(Boolean).join(" · ")}
            onRowClick={setViewing}
            emptyState={
              <EmptyState
                icon={<FileCheck2 />}
                title={hasFilters ? COPY.noMatch : COPY.empty}
                description={hasFilters ? COPY.noMatchHint : COPY.emptyHint}
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
              summaryLabel={COPY.pageSummary}
            />
          )}
        </>
      )}

      <PdfViewer letter={viewing} onClose={() => setViewing(null)} onDownload={download} />

      <ConfirmDialog
        open={dialog?.type === "email"}
        title={COPY.emailTitle}
        message={format(COPY.emailMessage, { email: dialog?.letter?.recipientEmail })}
        confirmLabel={COPY.emailConfirm}
        loading={action.isPending}
        onConfirm={sendEmail}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.type === "void"}
        variant="destructive"
        title={format(COPY.voidTitle, { number: dialog?.letter?.letterNumber })}
        message={COPY.voidMessage}
        confirmLabel={COPY.voidConfirm}
        loading={action.isPending}
        onConfirm={confirmVoid}
        onCancel={() => setDialog(null)}
      >
        <Textarea
          label={COPY.voidReason}
          name="voidReason"
          value={voidReason}
          onChange={(event) => {
            setVoidReason(event.target.value);
            setVoidError("");
          }}
          error={voidError}
          required
          rows={3}
          maxLength={500}
        />
      </ConfirmDialog>
    </section>
  );
}
