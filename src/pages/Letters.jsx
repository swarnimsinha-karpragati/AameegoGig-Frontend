import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { ToastProvider } from "../components/Toast";
import { ModuleSwitcher } from "../design-system";
import IssueLetterPanel from "../components/letters/IssueLetterPanel";
import IssuedLetters from "../components/letters/IssuedLetters";
import LettersHome from "../components/letters/LettersHome";
import ManageTemplates from "../components/letters/ManageTemplates";
import OfferCandidates from "../components/letters/OfferCandidates";
import TemplateEditor from "../components/letters/TemplateEditor";
import { useLetterRecipients } from "../hooks/useLetters";
import { getLetterAccess } from "../utils/roles";
import { OFFER_TEMPLATE_KEY } from "../utils/letterCatalog";
import { LETTERS_COPY } from "../utils/lettersCopy";
import {
  applyLettersChanges,
  candidateEmployeePath,
  canonicalLettersParams,
  convertCandidatePath,
  getIssueRecipientRule,
  getLettersTabs,
  lettersChanges,
  resolveLettersView,
} from "../utils/lettersNavigation";
import "../components/letters/Letters.css";

const currentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}") || {};
  } catch {
    return {};
  }
};

function LettersInner() {
  const permissions = getLetterAccess(currentUser());
  const navigate = useNavigate();
  const { vendor } = useParams();
  const [params, setParams] = useSearchParams();

  const tabs = getLettersTabs(permissions);
  const canonical = canonicalLettersParams(params, tabs, permissions);
  const redirect = canonical?.toString() ?? null;
  // Everything below reads the cleaned URL, so a bad link never reaches the API before the replace lands.
  const current = canonical || params;
  const view = resolveLettersView(current, tabs, permissions);
  const issueRecipientRule = getIssueRecipientRule(permissions);
  // Moving to another screen via a button focuses that screen's heading; tablist changes keep focus on the tab (ARIA tabs pattern).
  const [focusHeading, setFocusHeading] = useState(false);

  const { data: filterMatches = [] } = useLetterRecipients(
    { recipientType: view.forType, id: view.forRecipient },
    { enabled: Boolean(view.forRecipient) }
  );
  useEffect(() => {
    if (redirect !== null) setParams(new URLSearchParams(redirect), { replace: true });
  }, [redirect, setParams]);

  const update = useCallback(
    (changes, { replace = false } = {}) => setParams(applyLettersChanges(current, changes), { replace }),
    [current, setParams]
  );

  const openIssue = (target) => update(lettersChanges.openIssue(target));
  const goTo = (changes) => {
    setFocusHeading(true);
    update(changes);
  };

  return (
    <div className="wz-ds wz-letters">
      {!view.manage && (
        <ModuleSwitcher
          tabs={tabs}
          activeId={view.tab}
          onChange={(id) => {
            setFocusHeading(false);
            update(lettersChanges.tab(id));
          }}
          ariaLabel={LETTERS_COPY.tabs.ariaLabel}
        />
      )}

      {view.manage &&
        (view.templateId ? (
          <TemplateEditor
            key={view.templateId}
            templateId={view.templateId}
            canEdit={permissions.canEdit}
            canIssue={permissions.canIssue}
            onExit={() => goTo(lettersChanges.closeTemplate())}
            onSaved={(id) => update(lettersChanges.openTemplate(id), { replace: true })}
            onIssue={(templateId) => openIssue({ templateId })}
          />
        ) : (
          <ManageTemplates
            focusHeading={focusHeading}
            onOpen={(id) => update(lettersChanges.openTemplate(id))}
            onCreate={() => update(lettersChanges.openTemplate("new"))}
            onBack={() => goTo(lettersChanges.closeManage())}
          />
        ))}

      {!view.manage && view.tab === "issue" && (
        <LettersHome
          canEdit={permissions.canEdit}
          recipientRule={issueRecipientRule}
          focusHeading={focusHeading}
          onIssue={(templateId) => openIssue({ templateId })}
          onManage={() => goTo(lettersChanges.openManage())}
          onViewIssued={permissions.canView ? () => goTo(lettersChanges.viewIssued()) : undefined}
        />
      )}

      {!view.manage && view.tab === "issued" && (
        <IssuedLetters
          canIssue={permissions.canIssue}
          focusHeading={focusHeading}
          recipientFilter={view.forRecipient ? { id: view.forRecipient, type: view.forType, name: filterMatches[0]?.name } : null}
          onClearRecipientFilter={() => update(lettersChanges.clearRecipientFilter())}
          onIssue={() => openIssue()}
          onReissue={(letter) =>
            openIssue({
              templateId: letter.templateId,
              recipientId: letter.recipientType === "candidate" ? letter.candidateId : letter.employeeId,
              recipientType: letter.recipientType,
              replacesLetterId: letter._id,
            })
          }
        />
      )}

      {!view.manage && view.tab === "offers" && (
        <OfferCandidates
          canManage={permissions.canManageOffers}
          canIssue={permissions.canIssue}
          focusHeading={focusHeading}
          onSendOffer={(candidate) =>
            openIssue({ templateKey: OFFER_TEMPLATE_KEY, recipientId: candidate._id, recipientType: "candidate" })
          }
          onViewLetters={(candidate) => goTo(lettersChanges.viewIssued({ recipientId: candidate._id, recipientType: "candidate" }))}
          onConvert={(candidate) => navigate(convertCandidatePath(vendor, candidate))}
          onViewEmployee={(candidate) => navigate(candidateEmployeePath(vendor, candidate))}
        />
      )}

      <IssueLetterPanel
        open={view.issueOpen && redirect === null}
        onClose={() => update(lettersChanges.closeIssue())}
        templateId={view.issueTemplateId}
        templateKey={view.issueTemplateKey}
        recipientRule={issueRecipientRule}
        onChangeTemplate={(id) => update(lettersChanges.changeIssueTemplate(id), { replace: true })}
        initialRecipientId={view.recipientId}
        initialRecipientType={view.recipientType}
        replacesLetterId={view.replacesLetterId}
        onViewIssued={
          permissions.canView
            ? (recipient, recipientType) => goTo(lettersChanges.viewIssued({ recipientId: recipient?._id, recipientType }))
            : undefined
        }
        canAddCandidate={Boolean(permissions.canManageOffers)}
      />
    </div>
  );
}

export default function Letters() {
  return (
    <MainLayout>
      <ToastProvider>
        <LettersInner />
      </ToastProvider>
    </MainLayout>
  );
}
