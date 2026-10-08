import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, ExternalLink, PencilLine, RotateCcw, Search, Undo2, UserPlus } from "lucide-react";
import { Avatar, Badge, Button, Checkbox, ConfirmDialog, Drawer, Input, Select, Spinner, Textarea } from "../../design-system";
import { useIssuedLetter, useIssueLetter, useLetterRecipients, useLetterTemplates } from "../../hooks/useLetters";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { downloadDraftLetter, downloadIssuedLetter, previewLetter } from "../../services/letterService";
import { buildLetterCatalog, describeTemplate, filterIssuableTemplates, findTemplateByKey, letterNameForKey } from "../../utils/letterCatalog";
import {
  buildLetterRequest,
  buildPreviewRequest,
  draftLetterFileName,
  getApiError,
  hasLetterContent,
  isClientErrorStatus,
  isMultilineField,
  issuedLetterFileName,
  numberInputAttributes,
  stillNeededLabels,
  validateLetterInput,
  validateLetterInputs,
} from "../../utils/letterForms";
import { LETTERS_COPY, format } from "../../utils/lettersCopy";
import { recipientStatusBadge } from "../../utils/recipientStatus";
import { employeeSearchPath } from "../../utils/lettersNavigation";
import { ORG_PROFILE_SETTINGS_PATH, vendorScopedPath } from "../../utils/vendorPath";
import { useToast } from "../Toast";
import CandidateDrawer from "./CandidateDrawer";
import LetterPreviewFrame from "./LetterPreviewFrame";
import RichTextEditor from "./RichTextEditor";
import "./Letters.css";
import "./IssueLetterPanel.css";

const COPY = LETTERS_COPY.issue;
const EMPTY_PREVIEW = {
  html: "",
  bodyHtml: "",
  blankDetails: [],
  companyIncomplete: false,
  companyMessage: "",
  loading: false,
  error: "",
  errorStatus: null,
};
const NO_ANSWERS = Object.freeze({});

const INPUT_TYPES = {
  date: "date",
  date_past: "date",
  number: "number",
  currency_annual: "number",
  currency_monthly: "number",
  email: "email",
  phone: "tel",
  url: "url",
};

const LetterInputField = forwardRef(function LetterInputField({ field, value, error, disabled, onChange, onBlur }, ref) {
  const common = {
    ref,
    label: field.label,
    name: field.key,
    value: value ?? "",
    error,
    disabled,
    required: Boolean(field.required),
    helperText: field.required ? undefined : COPY.optionalHint,
    onChange: (event) => onChange(event.target.value),
    onBlur,
  };
  if (field.options?.length) {
    return (
      <Select
        {...common}
        placeholder={COPY.selectPlaceholder}
        options={field.options.map((option) => ({ value: option, label: option }))}
      />
    );
  }
  if (isMultilineField(field)) return <Textarea {...common} rows={4} maxLength={2000} />;
  return (
    <Input
      {...common}
      type={INPUT_TYPES[field.kind] || "text"}
      {...(numberInputAttributes(field) || { maxLength: 255 })}
    />
  );
});

function TemplateChooser({ templates, loading, error, notice, onChoose }) {
  const [search, setSearch] = useState("");
  const groups = useMemo(() => buildLetterCatalog(templates, { search }), [templates, search]);

  return (
    <div className="wz-issue-chooser">
      {notice && (
        <p className="wz-letters__notice wz-letters__notice--warning" role="status">
          {notice}
        </p>
      )}
      <h3 className="wz-letters__section-title">{COPY.chooseTitle}</h3>
      <Input
        label={COPY.chooseSearch}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        leftIcon={<Search size={16} />}
        placeholder={LETTERS_COPY.home.searchPlaceholder}
        maxLength={80}
      />
      {loading && <Spinner size="sm" label={COPY.loadingTemplates} />}
      {error && (
        <p className="wz-letters__notice wz-letters__notice--error" role="alert">
          {COPY.loadTemplatesError}
        </p>
      )}
      {!loading && !error && groups.length === 0 && (
        <p className="wz-letters__cell-sub">
          {search.trim() ? format(LETTERS_COPY.home.empty, { query: search.trim() }) : COPY.noTemplates}
        </p>
      )}
      {groups.map((group) => (
        <section key={group.id} className="wz-issue-chooser__group">
          <h4 className="wz-issue-chooser__group-title">{group.label}</h4>
          <div className="wz-issue-chooser__list">
            {group.items.map(({ template, description }) => (
              <button key={template._id} type="button" className="wz-issue-chooser__item" onClick={() => onChoose(template._id)}>
                <span className="wz-letters__cell-title">{template.name}</span>
                <span className="wz-letters__cell-sub">{description}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** A candidate just added from the panel, in the shape the people list uses. */
const candidateAsRecipient = (candidate) => ({
  _id: candidate._id,
  name: candidate.name,
  code: "",
  email: candidate.email || "",
  designation: candidate.designation || "",
  department: candidate.departmentName || "",
  status: candidate.status || "draft",
});

/** Copy for a template that only some people can receive (e.g. consultancy-only), else null. */
const recipientRuleCopy = (template) => (template?.recipientRule && COPY.recipientRules[template.recipientRule]) || null;

function emptyPeopleText(template, query) {
  const rule = recipientRuleCopy(template);
  if (rule) return query ? format(rule.noMatch, { query }) : rule.none;
  if (query) return format(COPY.noPeopleMatch, { query });
  if (template.recipientType !== "candidate") return COPY.noPeople;
  return template.isOffer ? COPY.noOfferCandidates : COPY.noCandidates;
}

function RecipientSearch({ template, labelledBy, selectedId, error, inputRef, onSelect, onCancel, onAddCandidate }) {
  const { recipientType } = template;
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 300);
  const { data: people = [], isFetching, isError } = useLetterRecipients({
    recipientType,
    search: debounced,
    templateId: template._id,
  });
  const showEmpty = !isFetching && !isError && people.length === 0;
  const rule = recipientRuleCopy(template);

  return (
    <div className="wz-issue__recipient-search">
      <Input
        ref={inputRef}
        aria-labelledby={labelledBy}
        value={search}
        error={error}
        onChange={(event) => setSearch(event.target.value)}
        leftIcon={<Search size={16} />}
        placeholder={recipientType === "candidate" ? COPY.searchCandidates : COPY.searchEmployees}
        maxLength={80}
      />
      {recipientType === "candidate" && onAddCandidate && (
        <div>
          <Button variant="outline" size="sm" icon={<UserPlus size={16} />} onClick={onAddCandidate}>
            {COPY.addCandidate}
          </Button>
        </div>
      )}
      {rule && <p className="wz-letters__cell-sub">{format(rule.only, { letter: template.name })}</p>}
      {isError && (
        <p className="wz-letters__notice wz-letters__notice--error" role="alert">
          {COPY.loadPeopleError}
        </p>
      )}
      <fieldset className="wz-picker" aria-busy={isFetching || undefined}>
        <legend className="wz-sr-only">{COPY.choosePerson}</legend>
        {showEmpty && <p className="wz-letters__cell-sub">{emptyPeopleText(template, debounced)}</p>}
        {people.map((person) => {
          const isSelected = selectedId === person._id;
          const badge = recipientStatusBadge(person.status, recipientType);
          return (
            <label key={person._id} className={`wz-picker__option${isSelected ? " is-selected" : ""}`}>
              <input type="radio" name="issue-letter-recipient" checked={isSelected} onChange={() => onSelect(person)} />
              <Avatar name={person.name} size="sm" />
              <span className="wz-letters__cell-main">
                <span className="wz-letters__cell-title">{person.name}</span>
                <span className="wz-letters__cell-sub">
                  {[person.code, person.designation, person.department].filter(Boolean).join(" · ") || person.email || "—"}
                </span>
              </span>
              {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
            </label>
          );
        })}
        {isFetching && <Spinner size="sm" label={COPY.loadingPeople} />}
      </fieldset>
      {onCancel && (
        <div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {COPY.cancel}
          </Button>
        </div>
      )}
    </div>
  );
}

function RecipientCard({ person, disabled, onChange }) {
  const role = [person.designation, person.department].filter(Boolean).join(" · ");
  return (
    <div className="wz-issue__recipient-card" data-testid="issue-recipient-card">
      <Avatar name={person.name} size="md" />
      <span className="wz-letters__cell-main">
        <span className="wz-letters__cell-title">{person.name}</span>
        {role && <span className="wz-letters__cell-sub">{role}</span>}
        <span className="wz-letters__cell-sub">{person.email || COPY.noEmailOnFile}</span>
      </span>
      <Button variant="outline" size="sm" onClick={onChange} disabled={disabled}>
        {COPY.change}
      </Button>
    </div>
  );
}

/**
 * One-screen issue flow: pick the letter (when not given), the person, answer the template's
 * questions and issue, with a live preview alongside. Mounted only while open so every opening
 * starts from a clean state.
 */
export default function IssueLetterPanel(props) {
  if (!props.open) return null;
  const key = `${props.initialRecipientType || ""}|${props.initialRecipientId || ""}|${props.replacesLetterId || ""}`;
  return <IssueLetterSession key={key} {...props} />;
}

function IssueLetterSession({
  onClose,
  templateId = "",
  templateKey = "",
  initialRecipientId = "",
  initialRecipientType = "",
  replacesLetterId = "",
  recipientRule = null,
  onViewIssued,
  onChangeTemplate,
  canAddCandidate = false,
}) {
  const toast = useToast();
  const issue = useIssueLetter();
  const { data: templates = [], isLoading: templatesLoading, isError: templatesError } = useLetterTemplates({ status: "active" });
  const whoId = `wz-issue-who-${useId().replace(/:/g, "")}`;

  const [selectedId, setSelectedId] = useState(templateId || "");
  const [syncedTemplateProp, setSyncedTemplateProp] = useState(templateId || "");
  const [canPickLetter, setCanPickLetter] = useState(!templateId);
  const [resolvingKey, setResolvingKey] = useState(Boolean(templateKey) && !templateId);
  const [unavailableId, setUnavailableId] = useState("");
  const [picked, setPicked] = useState(null);
  const [initialApplied, setInitialApplied] = useState(false);
  const [changingRecipient, setChangingRecipient] = useState(false);
  const [recipientError, setRecipientError] = useState("");
  const [values, setValues] = useState(NO_ANSWERS);
  const [answersGeneration, setAnswersGeneration] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [sendEmail, setSendEmail] = useState(false);
  const [preview, setPreview] = useState(EMPTY_PREVIEW);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draftHtml, setDraftHtml] = useState("");
  const [editError, setEditError] = useState("");
  const [editedHtml, setEditedHtml] = useState("");
  const [issueError, setIssueError] = useState(null);
  const [downloadingDraft, setDownloadingDraft] = useState(false);
  const [issued, setIssued] = useState(null);
  const [replacedApplied, setReplacedApplied] = useState(false);
  const [replaceDone, setReplaceDone] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [addingCandidate, setAddingCandidate] = useState(false);

  const fieldRefs = useRef({});
  const searchRef = useRef(null);
  const issuingRef = useRef(false);
  const downloadingDraftRef = useRef(false);

  const visibleTemplates = useMemo(
    () => filterIssuableTemplates(templates, { recipientRule, recipientType: initialRecipientType }),
    [templates, initialRecipientType, recipientRule]
  );
  const templatesReady = !templatesLoading && !templatesError;
  const onlyTemplate = recipientRule && visibleTemplates.length === 1 ? visibleTemplates[0] : null;
  const selectedTemplate = selectedId ? visibleTemplates.find((t) => t._id === selectedId) || null : null;
  const keyedTemplate = resolvingKey ? findTemplateByKey(visibleTemplates, templateKey) : null;
  const template = selectedTemplate || (!selectedId ? keyedTemplate || onlyTemplate : null);

  // A deep link to an archived, deleted or not-allowed template falls back to the chooser.
  if (selectedId && templatesReady && !selectedTemplate && unavailableId !== selectedId) {
    setUnavailableId(selectedId);
    setCanPickLetter(true);
  }
  const showUnavailable = Boolean(selectedId) && unavailableId === selectedId && !template;
  const showKeyUnavailable = resolvingKey && templatesReady && !selectedId && !template;
  const keyName = letterNameForKey(templateKey);
  const chooserNotice = showUnavailable
    ? COPY.templateUnavailable
    : showKeyUnavailable
      ? keyName
        ? format(COPY.templateKeyUnavailable, { name: keyName })
        : COPY.templateKeyUnavailableGeneric
      : "";
  const fields = useMemo(() => template?.inputFields || [], [template]);
  const recipient = picked && template && picked.type === template.recipientType ? picked.person : null;

  const resetLetter = () => {
    setValues(NO_ANSWERS);
    setAnswersGeneration((generation) => generation + 1);
    setFieldErrors({});
    setEditing(false);
    setDraftHtml("");
    setEditError("");
    setEditedHtml("");
    setIssueError(null);
    setPreview(EMPTY_PREVIEW);
  };

  const applyTemplate = (id) => {
    setSelectedId(id);
    setResolvingKey(false);
    resetLetter();
  };

  if ((templateId || "") !== syncedTemplateProp) {
    setSyncedTemplateProp(templateId || "");
    if (templateId && templateId !== selectedId) applyTemplate(templateId);
  }

  const chooseTemplate = (id) => {
    applyTemplate(id);
    onChangeTemplate?.(id);
  };

  const pickRecipient = (person, type) => {
    setPicked({ person, type });
    setChangingRecipient(false);
    setRecipientError("");
    setIssueError(null);
    setSendEmail(Boolean(person.email));
  };

  // Wait for the templates so a deep-linked letter is resolved first: the lookup then asks for the
  // person only if that letter can go to them (same rule as the people list).
  const initialType = initialRecipientType || template?.recipientType || "";
  const initialLookup = useLetterRecipients(
    { recipientType: initialType, id: initialRecipientId, templateId: template?._id || "" },
    { enabled: Boolean(initialRecipientId && initialType) && !initialApplied && !templatesLoading }
  );
  const { data: initialMatches = [], isFetching: initialLoading } = initialLookup;
  const initialMatch = initialMatches.find((person) => person._id === initialRecipientId) || null;
  const initialSettled = !initialLoading && !initialLookup.isPlaceholderData;
  const initialMissing = initialSettled && initialLookup.isSuccess && !initialMatch;
  const initialFailed = initialSettled && initialLookup.isError;
  // The backend only returns the linked person when this letter can go to them, so "no match"
  // means not eligible (or no longer on record): say so instead of silently showing the search.
  const linkedNotice =
    Boolean(initialRecipientId) && !initialApplied && template && !picked && (initialMissing || initialFailed)
      ? initialFailed
        ? COPY.linkedRecipientError
        : format(recipientRuleCopy(template)?.linkedNotEligible || COPY.linkedRecipientUnavailable, { letter: template.name })
      : "";

  useEffect(() => {
    if (initialApplied || !initialMatch) return;
    setInitialApplied(true);
    setPicked({ person: initialMatch, type: initialType });
    setSendEmail(Boolean(initialMatch.email));
  }, [initialApplied, initialMatch, initialType]);

  // "Correct and reissue": start from the answers of the letter being replaced (once), and send its id
  // only while it is still issued — the backend voids it when the corrected letter is issued.
  const replacing = useIssuedLetter(replacesLetterId, { enabled: Boolean(replacesLetterId) && !replaceDone });
  const replacedLetter = replacing.data || null;
  const replaced = !replaceDone && replacedLetter?.status === "issued" ? replacedLetter : null;
  useEffect(() => {
    if (replacedApplied || !replaced || !template) return;
    setReplacedApplied(true);
    const previous = replaced.values || {};
    setValues(
      Object.fromEntries(
        (template.inputFields || []).filter((field) => previous[field.key] != null).map((field) => [field.key, String(previous[field.key])])
      )
    );
  }, [replacedApplied, replaced, template]);

  // Debounce answers together with their generation so a reset (template switch, "Issue another")
  // previews the cleared answers at once instead of the previous letter's still-pending values, and
  // keeps previewing them until the debounce catches up with whatever is typed next.
  const answers = useMemo(() => ({ generation: answersGeneration, values }), [answersGeneration, values]);
  const debouncedAnswers = useDebouncedValue(answers, 400);
  const previewAnswers = debouncedAnswers.generation === answersGeneration ? debouncedAnswers.values : NO_ANSWERS;
  const previewPending = previewAnswers !== values;

  const previewKey =
    template && recipient
      ? JSON.stringify(buildPreviewRequest({ template, recipient, values: previewAnswers, editedHtml: editedHtml || null }))
      : "";

  useEffect(() => {
    if (!previewKey) {
      setPreview(EMPTY_PREVIEW);
      return undefined;
    }
    let cancelled = false;
    setPreview((current) => ({ ...current, loading: true, error: "", errorStatus: null }));
    previewLetter(JSON.parse(previewKey))
      .then((data) => {
        if (cancelled) return;
        setPreview({
          ...EMPTY_PREVIEW,
          html: data?.html || "",
          bodyHtml: data?.bodyHtml || "",
          blankDetails: Array.isArray(data?.blankDetails) ? data.blankDetails : [],
          companyIncomplete: data?.companyIncomplete === true,
          companyMessage: typeof data?.companyMessage === "string" ? data.companyMessage : "",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        const apiError = getApiError(error, COPY.previewError);
        setPreview({ ...EMPTY_PREVIEW, error: apiError.message, errorStatus: apiError.status });
      });
    return () => {
      cancelled = true;
    };
  }, [previewKey, previewAttempt]);

  const stillNeeded = stillNeededLabels(fields, values);
  const answersValid = validateLetterInputs(fields, values).valid;
  const previewReady = Boolean(preview.html) && !preview.loading && !preview.error && !previewPending;
  const previewRefused = Boolean(preview.error) && isClientErrorStatus(preview.errorStatus);
  const companyBlocked = preview.companyIncomplete;
  const locked = editing || Boolean(editedHtml);
  const emailOn = sendEmail && Boolean(recipient?.email);
  const issueReasonId = `${whoId}-issue-reason`;
  const draftReasonId = `${whoId}-draft-reason`;
  const draftNeedsAnswers = Boolean(recipient) && !answersValid;

  const focusField = (key) => fieldRefs.current[key]?.focus();

  const setValue = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setIssueError(null);
  };

  const startEditing = () => {
    setDraftHtml(preview.bodyHtml);
    setEditError("");
    setEditing(true);
  };

  const applyEdits = () => {
    if (!hasLetterContent(draftHtml)) {
      setEditError(COPY.emptyLetter);
      return;
    }
    setEditedHtml(draftHtml);
    setEditing(false);
    setEditError("");
  };

  const cancelEdits = () => {
    setEditing(false);
    setDraftHtml("");
    setEditError("");
  };

  const handleIssue = async () => {
    if (issuingRef.current) return;
    setIssueError(null);
    if (!recipient) {
      setRecipientError(COPY.chooseRecipient);
      searchRef.current?.focus();
      return;
    }
    const result = validateLetterInputs(fields, values);
    setFieldErrors(result.errors);
    if (!result.valid) {
      focusField(fields.find((field) => result.errors[field.key])?.key);
      return;
    }
    issuingRef.current = true;
    try {
      const response = await issue.mutateAsync(
        buildLetterRequest({
          template,
          recipient,
          values,
          editedHtml: editedHtml || null,
          sendEmail: emailOn,
          replacesLetterId: replaced?._id || "",
        })
      );
      setIssued({ ...response, emailRequested: emailOn, replacedNumber: replaced?.letterNumber || "" });
      if (replaced) setReplaceDone(true);
      if (emailOn && response?.emailed === false) {
        toast.warning(response.emailError || COPY.emailFailed);
      } else {
        toast.success(format(emailOn ? COPY.issuedEmailedToast : COPY.issuedToast, { letter: template.name }));
      }
    } catch (error) {
      const apiError = getApiError(error, COPY.issueError);
      if (apiError.field && fields.some((field) => field.key === apiError.field)) {
        setFieldErrors((current) => ({ ...current, [apiError.field]: apiError.message }));
        focusField(apiError.field);
        return;
      }
      setIssueError(apiError);
    } finally {
      issuingRef.current = false;
    }
  };

  const handleDownloadDraft = async () => {
    if (downloadingDraftRef.current) return;
    downloadingDraftRef.current = true;
    setDownloadingDraft(true);
    try {
      await downloadDraftLetter(
        buildLetterRequest({ template, recipient, values, editedHtml: editedHtml || null }),
        draftLetterFileName(template.name, recipient.name)
      );
    } catch (error) {
      toast.error(getApiError(error, COPY.draftError).message);
    } finally {
      downloadingDraftRef.current = false;
      setDownloadingDraft(false);
    }
  };

  const handleDownloadIssued = async () => {
    const letter = issued?.letter;
    if (!letter) return;
    try {
      await downloadIssuedLetter(letter._id, issuedLetterFileName(letter));
    } catch (error) {
      toast.error(getApiError(error, COPY.downloadError).message);
    }
  };

  const canChooseLetter = canPickLetter && !onlyTemplate;

  const issueAnother = () => {
    setIssued(null);
    if (!initialRecipientId) setPicked(null);
    if (canChooseLetter) chooseTemplate("");
    else resetLetter();
  };

  const hasWork = editing || Boolean(editedHtml) || Object.values(values).some((value) => String(value ?? "").trim());
  const requestClose = () => {
    if (issue.isPending) return;
    if (!issued && hasWork) {
      setConfirmClose(true);
      return;
    }
    onClose();
  };

  const settingsHref = vendorScopedPath(window.location, ORG_PROFILE_SETTINGS_PATH);
  const employeesHref = employeeSearchPath(String(window.location.pathname || "").split("/").filter(Boolean)[0] || "", recipient || {});

  const renderSuccess = () => (
    <div className="wz-issue__success" role="status">
      <CheckCircle2 size={40} color="var(--wz-color-status-success)" aria-hidden="true" />
      <h3 className="wz-letters__section-title">{COPY.success}</h3>
      <p className="wz-letters__section-desc">
        {format(COPY.successSummary, { letter: template?.name, name: recipient?.name, number: issued.letter?.letterNumber })}
      </p>
      {issued.emailed && <p className="wz-letters__section-desc">{format(COPY.emailed, { email: recipient?.email })}</p>}
      {!issued.emailed && issued.emailRequested && <p className="wz-letters__notice wz-letters__notice--warning">{COPY.emailFailed}</p>}
      {issued.replacedNumber && <p className="wz-letters__section-desc">{format(COPY.successReplaced, { number: issued.replacedNumber })}</p>}
      <p className="wz-letters__section-desc">{COPY.savedNote}</p>
      <Button icon={<Download size={16} />} onClick={handleDownloadIssued}>
        {COPY.downloadPdf}
      </Button>
    </div>
  );

  const renderRecipient = () => {
    const waitingForInitial = Boolean(initialRecipientId) && !initialApplied && initialLoading;
    return (
      <section className="wz-issue__section">
        <h3 id={whoId} className="wz-issue__section-title">
          {COPY.who}
        </h3>
        {linkedNotice && (
          <p className="wz-letters__notice wz-letters__notice--warning" role="status">
            {linkedNotice}
          </p>
        )}
        {waitingForInitial ? (
          <Spinner size="sm" label={COPY.loadingPeople} />
        ) : recipient && !changingRecipient ? (
          <RecipientCard person={recipient} disabled={locked} onChange={() => setChangingRecipient(true)} />
        ) : (
          <RecipientSearch
            key={template.recipientType}
            template={template}
            labelledBy={whoId}
            selectedId={recipient?._id}
            error={recipientError}
            inputRef={searchRef}
            onSelect={(person) => pickRecipient(person, template.recipientType)}
            onCancel={recipient ? () => setChangingRecipient(false) : null}
            onAddCandidate={canAddCandidate ? () => setAddingCandidate(true) : undefined}
          />
        )}
      </section>
    );
  };

  const renderQuestions = () => (
    <section className="wz-issue__section">
      <h3 className="wz-issue__section-title">{COPY.details}</h3>
      {fields.length === 0 ? (
        <p className="wz-letters__cell-sub">{COPY.noDetails}</p>
      ) : (
        <>
          {Boolean(editedHtml) && <p className="wz-letters__notice">{COPY.lockedByEdits}</p>}
          <div className="wz-issue__questions">
            {fields.map((field) => (
              <LetterInputField
                key={field.key}
                ref={(node) => {
                  fieldRefs.current[field.key] = node;
                }}
                field={field}
                value={values[field.key]}
                error={fieldErrors[field.key]}
                disabled={locked}
                onChange={(value) => setValue(field.key, value)}
                onBlur={() => {
                  const error = validateLetterInput(field, values[field.key]);
                  setFieldErrors((current) => ({ ...current, [field.key]: error || undefined }));
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );

  const companyIssueError = issueError?.code === "COMPANY_PROFILE_INCOMPLETE";
  const companyProblem = companyIssueError
    ? issueError.message || COPY.companyIncomplete
    : companyBlocked
      ? preview.companyMessage || COPY.companyIncomplete
      : "";

  const recheckCompany = useCallback(() => {
    setIssueError((current) => (current?.code === "COMPANY_PROFILE_INCOMPLETE" ? null : current));
    setPreviewAttempt((n) => n + 1);
  }, []);

  // HR usually fixes the details in the Settings tab opened from the warning, so check again on return.
  const watchCompany = Boolean(companyProblem);
  useEffect(() => {
    if (!watchCompany) return undefined;
    window.addEventListener("focus", recheckCompany);
    return () => window.removeEventListener("focus", recheckCompany);
  }, [watchCompany, recheckCompany]);

  const replaceNotice = !replacesLetterId || replaceDone
    ? ""
    : replacing.isError
      ? COPY.replacesLoadError
      : replacedLetter && replacedLetter.status !== "issued"
        ? format(COPY.replacesAlreadyVoid, { number: replacedLetter.letterNumber })
        : "";

  const renderLetterNotes = () => (
    <>
      {replaced && (
        <div className="wz-letters__notice" role="status">
          <p className="wz-issue__error-text">{format(COPY.replacesNotice, { number: replaced.letterNumber })}</p>
          {replaced.isEdited && <p className="wz-issue__error-text">{format(COPY.replacesEditedNote, { number: replaced.letterNumber })}</p>}
        </div>
      )}
      {replaceNotice && <p className="wz-letters__notice wz-letters__notice--warning" role="status">{replaceNotice}</p>}
      {template?.key === "termination" && (
        <div className="wz-letters__notice wz-letters__notice--warning">
          <p className="wz-issue__error-text">{COPY.terminationNote}</p>
          <div className="wz-letters__badges">
            <a className="wz-issue__link" href={employeesHref} target="_blank" rel="noreferrer">
              {COPY.goToEmployees}
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
      {template?.key === "transfer" && <p className="wz-letters__notice">{COPY.transferNote}</p>}
    </>
  );

  const renderWarnings = () => (
    <>
      {recipient && !recipient.email && <p className="wz-letters__notice">{COPY.noEmail}</p>}
      <div aria-live="polite" data-testid="issue-blank-details">
        {recipient && preview.blankDetails.length > 0 && (
          <p className="wz-letters__notice wz-letters__notice--warning">
            {format(COPY.blankDetails, {
              name: recipient.name,
              list: preview.blankDetails.map((detail) => detail.label).join(", "),
              record: template.recipientType === "candidate" ? COPY.recordCandidate : COPY.recordEmployee,
            })}
          </p>
        )}
      </div>
      {companyProblem && (
        <div
          className={`wz-letters__notice ${companyIssueError ? "wz-letters__notice--error" : "wz-letters__notice--warning"}`}
          role={companyIssueError ? "alert" : undefined}
        >
          <p className="wz-issue__error-text">{companyProblem}</p>
          <div className="wz-letters__badges">
            <a className="wz-issue__link" href={settingsHref} target="_blank" rel="noreferrer">
              {COPY.openSettings}
              <ExternalLink size={14} aria-hidden="true" />
            </a>
            <Button variant="outline" size="sm" icon={<RotateCcw size={16} />} onClick={recheckCompany}>
              {COPY.checkCompanyAgain}
            </Button>
          </div>
        </div>
      )}
      {issueError && !companyIssueError && (
        <div className="wz-letters__notice wz-letters__notice--error" role="alert">
          <p className="wz-issue__error-text">{issueError.message}</p>
        </div>
      )}
    </>
  );

  const renderPreview = () => (
    <div className="wz-issue__preview">
      <div aria-live="polite" data-testid="issue-still-needed">
        {stillNeeded.length > 0 && (
          <p className="wz-letters__notice wz-letters__notice--warning">{format(COPY.stillNeeded, { list: stillNeeded.join(", ") })}</p>
        )}
      </div>
      {editing ? (
        <>
          <p className="wz-letters__notice">{COPY.editNote}</p>
          <RichTextEditor value={draftHtml} onChange={setDraftHtml} label={COPY.editWording} minHeight={480} allowSource={false} />
          {editError && (
            <p className="wz-letters__notice wz-letters__notice--error" role="alert">
              {editError}
            </p>
          )}
          <div className="wz-letters__badges">
            <Button onClick={applyEdits}>{COPY.apply}</Button>
            <Button variant="secondary" onClick={cancelEdits}>
              {COPY.cancel}
            </Button>
          </div>
        </>
      ) : (
        <>
          {recipient && (
            <div className="wz-issue__preview-actions">
              <Button
                variant="outline"
                size="sm"
                icon={<PencilLine size={16} />}
                onClick={startEditing}
                disabled={!previewReady || !answersValid}
              >
                {COPY.editWording}
              </Button>
              {editedHtml && (
                <Button variant="ghost" size="sm" icon={<Undo2 size={16} />} onClick={() => setEditedHtml("")}>
                  {COPY.undo}
                </Button>
              )}
              {editedHtml && <Badge tone="info">{COPY.edited}</Badge>}
              {!answersValid && <span className="wz-letters__cell-sub">{COPY.answerFirst}</span>}
              {preview.error && (
                <Button variant="outline" size="sm" icon={<RotateCcw size={16} />} onClick={() => setPreviewAttempt((n) => n + 1)}>
                  {COPY.retryPreview}
                </Button>
              )}
            </div>
          )}
          <LetterPreviewFrame
            html={preview.html}
            loading={preview.loading}
            error={preview.error}
            title={COPY.previewTitle}
            emptyText={COPY.previewEmpty}
          />
        </>
      )}
    </div>
  );

  const renderForm = () => (
    <div className="wz-issue">
      <div className="wz-issue__form">
        {canChooseLetter && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft size={16} />}
              onClick={() => chooseTemplate("")}
              disabled={issue.isPending || locked}
            >
              {COPY.changeLetter}
            </Button>
          </div>
        )}
        {renderLetterNotes()}
        {renderRecipient()}
        {renderQuestions()}
        {renderWarnings()}
        <Checkbox
          label={recipient?.email ? format(COPY.sendEmail, { email: recipient.email }) : COPY.sendEmailDisabled}
          checked={emailOn}
          disabled={!recipient?.email}
          onChange={(event) => setSendEmail(event.target.checked)}
        />
      </div>
      {renderPreview()}
    </div>
  );

  let body;
  let footer = null;
  if (issued) {
    body = renderSuccess();
    footer = (
      <div className="wz-letters__drawer-footer">
        {onViewIssued && (
          <Button variant="ghost" onClick={() => onViewIssued(recipient, template?.recipientType)}>
            {COPY.viewIssued}
          </Button>
        )}
        <div className="wz-letters__drawer-footer-end">
          <Button variant="secondary" onClick={issueAnother}>
            {COPY.issueAnother}
          </Button>
          <Button onClick={onClose}>{COPY.done}</Button>
        </div>
      </div>
    );
  } else if (template) {
    body = renderForm();
    footer = (
      <div className="wz-letters__drawer-footer-end">
        <Button
          variant="secondary"
          icon={<Download size={16} />}
          onClick={handleDownloadDraft}
          loading={downloadingDraft}
          disabled={!recipient || !previewReady || editing || draftNeedsAnswers}
          aria-describedby={draftNeedsAnswers ? draftReasonId : undefined}
        >
          {COPY.downloadDraft}
        </Button>
        {draftNeedsAnswers && (
          <span id={draftReasonId} className="wz-letters__cell-sub">
            {COPY.draftNeedsAnswers}
          </span>
        )}
        {companyBlocked && (
          <span id={issueReasonId} className="wz-letters__cell-sub">
            {COPY.issueBlockedCompany}
          </span>
        )}
        <Button
          onClick={handleIssue}
          loading={issue.isPending}
          disabled={editing || previewRefused || companyBlocked}
          aria-describedby={companyBlocked ? issueReasonId : undefined}
        >
          {COPY.issue}
        </Button>
      </div>
    );
  } else {
    body = (
      <TemplateChooser
        templates={visibleTemplates}
        loading={templatesLoading}
        error={templatesError}
        notice={chooserNotice}
        onChoose={chooseTemplate}
      />
    );
  }

  const subtitle = template
    ? describeTemplate(template)
    : picked
      ? format(COPY.forPerson, { name: picked.person.name })
      : undefined;

  return (
    <Drawer
      open
      onClose={requestClose}
      title={template ? template.name : COPY.title}
      subtitle={subtitle}
      width={template && !issued ? 1100 : 640}
      footer={footer}
    >
      {body}
      {canAddCandidate && (
        <CandidateDrawer
          open={addingCandidate}
          candidate={null}
          onClose={() => setAddingCandidate(false)}
          onSaved={(saved) => pickRecipient(candidateAsRecipient(saved), "candidate")}
        />
      )}
      <ConfirmDialog
        open={confirmClose}
        variant="destructive"
        title={COPY.discardTitle}
        message={COPY.discardMessage}
        confirmLabel={COPY.discard}
        cancelLabel={COPY.keepEditing}
        onConfirm={() => {
          setConfirmClose(false);
          onClose();
        }}
        onCancel={() => setConfirmClose(false)}
      />
    </Drawer>
  );
}
