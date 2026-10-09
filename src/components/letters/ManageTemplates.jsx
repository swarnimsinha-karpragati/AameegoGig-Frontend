import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, ArrowLeft, Copy, Eye, FileText, FileUp, PencilLine, Plus, Sparkles } from "lucide-react";
import { Badge, Button, ConfirmDialog, DataTable, DataToolbar, EmptyState, Input, Select } from "../../design-system";
import useFocusOnMount from "../../hooks/useFocusOnMount";
import { useAiStatus } from "../../hooks/useAi";
import { useLetterTemplateAction, useLetterTemplates } from "../../hooks/useLetters";
import { validateField } from "../../utils/inputValidation";
import { templateGroup } from "../../utils/letterCatalog";
import { formatLetterDate, getApiError, recipientTypeLabel } from "../../utils/letterForms";
import { LETTERS_COPY, format } from "../../utils/lettersCopy";
import { useToast } from "../Toast";
import AiTemplateDialog from "./ai/AiTemplateDialog";

const COPY = LETTERS_COPY.manage;

const STATUS_FILTERS = [
  { value: "active", label: COPY.statusActive },
  { value: "archived", label: COPY.statusArchived },
];

export default function ManageTemplates({ focusHeading = false, onOpen, onCreate, onAiDrafted, onBack }) {
  const headingRef = useFocusOnMount(focusHeading);
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [dialog, setDialog] = useState(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateError, setDuplicateError] = useState("");
  const [aiMode, setAiMode] = useState(null);
  const aiStatus = useAiStatus();
  const showAi = aiStatus.enabled && Boolean(onAiDrafted);

  const { data: templates = [], isLoading, isError, refetch } = useLetterTemplates({ status });
  const action = useLetterTemplateAction();

  const query = search.trim().toLowerCase();
  const rows = useMemo(
    () => templates.filter((t) => !query || [t.name, templateGroup(t).label].join("\n").toLowerCase().includes(query)),
    [templates, query]
  );

  const run = async (payload, successMessage) => {
    try {
      const result = await action.mutateAsync(payload);
      toast.success(successMessage);
      setDialog(null);
      return result;
    } catch (error) {
      toast.error(getApiError(error, COPY.actionError).message);
      return null;
    }
  };

  const confirmDuplicate = async () => {
    const err = validateField({ name: "name", label: COPY.templateNameLabel, value: duplicateName, kind: "display_name", required: true });
    if (err) {
      setDuplicateError(err);
      return;
    }
    const copy = await run({ action: "duplicate", id: dialog.template._id, value: duplicateName.trim() }, COPY.duplicated);
    if (copy?._id) onOpen(copy._id);
  };

  const rowActions = (template) => {
    const archived = template.status === "archived";
    return [
      archived
        ? { label: COPY.view, icon: <Eye size={16} />, onClick: () => onOpen(template._id) }
        : { label: COPY.edit, icon: <PencilLine size={16} />, onClick: () => onOpen(template._id) },
      {
        label: COPY.duplicate,
        icon: <Copy size={16} />,
        onClick: () => {
          setDuplicateName(format(COPY.duplicateSuffix, { name: template.name }).slice(0, 100));
          setDuplicateError("");
          setDialog({ type: "duplicate", template });
        },
      },
      archived
        ? { label: COPY.restore, icon: <ArchiveRestore size={16} />, onClick: () => run({ action: "archive", id: template._id, value: false }, COPY.restored) }
        : { label: COPY.archive, icon: <Archive size={16} />, danger: true, onClick: () => setDialog({ type: "archive", template }) },
    ];
  };

  const columns = [
    {
      key: "name",
      header: COPY.columns.name,
      render: (t) => (
        <span className="wz-letters__badges">
          <span className="wz-letters__cell-title">{t.name}</span>
          {t.isSystem && <Badge tone={t.isCustomised ? "info" : "brand"}>{t.isCustomised ? COPY.badgeCustomised : COPY.badgeDefault}</Badge>}
          {t.status === "archived" && <Badge tone="warning">{COPY.badgeArchived}</Badge>}
        </span>
      ),
    },
    { key: "category", header: COPY.columns.group, render: (t) => templateGroup(t).label },
    { key: "recipientType", header: COPY.columns.whoFor, render: (t) => recipientTypeLabel(t.recipientType) },
    {
      key: "updatedAt",
      header: COPY.columns.updated,
      render: (t) => (
        <span className="wz-letters__cell-main">
          <span>{formatLetterDate(t.updatedAt)}</span>
          {t.updatedByName && <span className="wz-letters__cell-sub">{t.updatedByName}</span>}
        </span>
      ),
    },
  ];

  return (
    <section className="wz-letters__section" aria-labelledby="letters-manage-title">
      <div>
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={onBack}>
          {COPY.back}
        </Button>
      </div>
      <div className="wz-letters__section-head">
        <div>
          <h2 id="letters-manage-title" ref={headingRef} tabIndex={-1} className="wz-letters__section-title">
            {COPY.title}
          </h2>
          <p className="wz-letters__section-desc">{COPY.description}</p>
        </div>
        <div className="wz-letters__actions">
          {showAi && aiStatus.personalData && (
            <Button variant="outline" icon={<FileUp size={16} />} onClick={() => setAiMode("import")}>
              {LETTERS_COPY.ai.importWord}
            </Button>
          )}
          {showAi && (
            <Button variant="outline" icon={<Sparkles size={16} />} onClick={() => setAiMode("draft")}>
              {LETTERS_COPY.ai.startWithAi}
            </Button>
          )}
          <Button icon={<Plus size={16} />} onClick={onCreate}>
            {COPY.create}
          </Button>
        </div>
      </div>

      <DataToolbar
        search={{ value: search, onChange: setSearch, placeholder: COPY.searchLabel, ariaLabel: COPY.searchLabel }}
        filters={
          <Select
            className="wz-letters__filter"
            label={COPY.show}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={STATUS_FILTERS}
          />
        }
      />

      {isError ? (
        <EmptyState
          icon={<FileText />}
          title={COPY.loadError}
          description={COPY.loadErrorHint}
          action={<Button variant="secondary" onClick={() => refetch()}>{COPY.retry}</Button>}
        />
      ) : (
        <DataTable
          caption={COPY.caption}
          columns={columns}
          rows={rows}
          rowKey="_id"
          loading={isLoading}
          rowActions={rowActions}
          getRowLabel={(t) => t.name}
          onRowClick={(t) => onOpen(t._id)}
          emptyState={
            <EmptyState
              icon={<FileText />}
              title={query ? COPY.noMatch : status === "archived" ? COPY.noArchived : COPY.noTemplates}
              description={query ? COPY.noMatchHint : undefined}
              action={
                query ? (
                  <Button variant="secondary" onClick={() => setSearch("")}>
                    {LETTERS_COPY.home.clearSearch}
                  </Button>
                ) : null
              }
            />
          }
        />
      )}

      {aiMode && (
        <AiTemplateDialog
          mode={aiMode}
          onCancel={() => setAiMode(null)}
          onDrafted={(result) => {
            setAiMode(null);
            onAiDrafted(result);
          }}
        />
      )}
      <ConfirmDialog
        open={dialog?.type === "duplicate"}
        title={COPY.duplicateTitle}
        confirmLabel={COPY.duplicate}
        loading={action.isPending}
        onConfirm={confirmDuplicate}
        onCancel={() => setDialog(null)}
      >
        <Input
          label={COPY.duplicateName}
          name="duplicateName"
          value={duplicateName}
          onChange={(event) => {
            setDuplicateName(event.target.value);
            setDuplicateError("");
          }}
          error={duplicateError}
          required
          maxLength={100}
        />
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog?.type === "archive"}
        variant="destructive"
        title={format(COPY.archiveTitle, { name: dialog?.template?.name })}
        message={COPY.archiveMessage}
        confirmLabel={COPY.archive}
        loading={action.isPending}
        onConfirm={() => run({ action: "archive", id: dialog.template._id, value: true }, COPY.archived)}
        onCancel={() => setDialog(null)}
      />
    </section>
  );
}
