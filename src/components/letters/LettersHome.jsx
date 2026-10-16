import { useMemo, useState } from "react";
import { FileText, Search, Settings2 } from "lucide-react";
import { Badge, Button, EmptyState, Input, Spinner } from "../../design-system";
import { useIssuedLetters, useLetterTemplates } from "../../hooks/useLetters";
import useFocusOnMount from "../../hooks/useFocusOnMount";
import { buildLetterCatalog, filterIssuableTemplates } from "../../utils/letterCatalog";
import { LETTER_STATUS_META, formatLetterDate } from "../../utils/letterForms";
import { LETTERS_COPY, format } from "../../utils/lettersCopy";
import "./Letters.css";
import "./LettersHome.css";

const COPY = LETTERS_COPY.home;
const RECENT_PARAMS = { limit: 5, page: 1 };

function LetterCatalog({ recipientRule, onIssue }) {
  const [search, setSearch] = useState("");
  const { data: templates = [], isLoading, isError, refetch } = useLetterTemplates({ status: "active" });
  const query = search.trim();
  const groups = useMemo(
    () => buildLetterCatalog(filterIssuableTemplates(templates, { recipientRule }), { search: query }),
    [templates, recipientRule, query]
  );

  return (
    <>
      <Input
        className="wz-lhome__search"
        type="search"
        label={COPY.searchLabel}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        leftIcon={<Search size={16} />}
        placeholder={COPY.searchPlaceholder}
        maxLength={80}
      />

      {isLoading && <Spinner size="sm" label={LETTERS_COPY.issue.loadingTemplates} />}

      {isError && (
        <div className="wz-letters__notice wz-letters__notice--error wz-lhome__notice" role="alert">
          <span>{LETTERS_COPY.issue.loadTemplatesError}</span>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            {LETTERS_COPY.issue.retryPreview}
          </Button>
        </div>
      )}

      {!isLoading && !isError && groups.length === 0 && (
        <EmptyState
          icon={<FileText />}
          title={query ? format(COPY.empty, { query }) : LETTERS_COPY.issue.noTemplates}
          action={
            query ? (
              <Button variant="secondary" onClick={() => setSearch("")}>
                {COPY.clearSearch}
              </Button>
            ) : null
          }
        />
      )}

      {groups.map((group) => {
        const headingId = `wz-lhome-group-${group.id}`;
        return (
          <section key={group.id} className="wz-lhome__group" aria-labelledby={headingId}>
            <h3 id={headingId} className="wz-lhome__group-title">
              {group.label}
            </h3>
            <ul className="wz-lhome__grid">
              {group.items.map(({ template, description }) => (
                <li key={template._id}>
                  <button type="button" className="wz-lhome__card" onClick={() => onIssue(template._id)}>
                    <span className="wz-lhome__card-name">{template.name}</span>
                    <span className="wz-lhome__card-desc">{description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

function RecentlyIssued({ onViewIssued }) {
  const { data, isLoading, isError } = useIssuedLetters(RECENT_PARAMS);
  const letters = data?.letters || [];

  return (
    <section className="wz-letters__section wz-lhome__recent" aria-labelledby="wz-lhome-recent-title">
      <div className="wz-letters__section-head">
        <h2 id="wz-lhome-recent-title" className="wz-letters__section-title">
          {COPY.recent}
        </h2>
        <Button variant="ghost" size="sm" onClick={onViewIssued}>
          {COPY.viewAll}
        </Button>
      </div>
      {isLoading && <Spinner size="sm" />}
      {isError && <p className="wz-letters__notice wz-letters__notice--error">{COPY.recentError}</p>}
      {!isLoading && !isError && letters.length === 0 && <p className="wz-letters__cell-sub">{COPY.recentEmpty}</p>}
      {letters.length > 0 && (
        <ul className="wz-lhome__recent-list">
          {letters.map((letter) => {
            const status = LETTER_STATUS_META[letter.status];
            return (
              <li key={letter._id} className="wz-lhome__recent-item">
                <span className="wz-letters__cell-main">
                  <span className="wz-letters__cell-title">{letter.recipientName}</span>
                  <span className="wz-letters__cell-sub">{letter.templateName}</span>
                </span>
                <span className="wz-lhome__recent-meta">
                  <span className="wz-letters__cell-sub">{formatLetterDate(letter.issuedAt)}</span>
                  {status && <Badge tone={status.tone}>{status.label}</Badge>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Issue-first landing: every card opens the issue screen for that template, never the editor.
 * Recently issued letters show only when `onViewIssued` is given (people who can view issued letters).
 */
export default function LettersHome({ canEdit, recipientRule = null, focusHeading = false, onIssue, onManage, onViewIssued }) {
  const headingRef = useFocusOnMount(focusHeading);
  return (
    <div className="wz-lhome">
      <section className="wz-letters__section" aria-labelledby="wz-lhome-title">
        <div className="wz-letters__section-head">
          <div>
            <h2 id="wz-lhome-title" ref={headingRef} tabIndex={-1} className="wz-letters__section-title">
              {COPY.title}
            </h2>
            <p className="wz-letters__section-desc">{COPY.description}</p>
          </div>
          {canEdit && (
            <Button variant="secondary" icon={<Settings2 size={16} />} onClick={onManage}>
              {COPY.manage}
            </Button>
          )}
        </div>
        <LetterCatalog recipientRule={recipientRule} onIssue={onIssue} />
      </section>
      {onViewIssued && <RecentlyIssued onViewIssued={onViewIssued} />}
    </div>
  );
}
