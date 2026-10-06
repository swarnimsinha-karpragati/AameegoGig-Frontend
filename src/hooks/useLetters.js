import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveLetterTemplate,
  createLetterTemplate,
  duplicateLetterTemplate,
  getLetterPlaceholders,
  getLetterTemplate,
  getLetterTemplateVersions,
  getLetterTemplates,
  resetLetterTemplate,
  restoreLetterTemplateVersion,
  updateLetterTemplate,
} from "../services/letterTemplateService";
import {
  emailIssuedLetter,
  getIssuedLetters,
  getLetterRecipients,
  issueLetter,
  voidIssuedLetter,
} from "../services/letterService";
import {
  createOfferCandidate,
  deleteOfferCandidate,
  getOfferCandidate,
  getOfferCandidates,
  linkOfferCandidateEmployee,
  setOfferCandidateStatus,
  updateOfferCandidate,
} from "../services/offerCandidateService";

export const LETTER_TEMPLATES_KEY = "letter-templates";
export const ISSUED_LETTERS_KEY = "issued-letters";
export const OFFER_CANDIDATES_KEY = "offer-candidates";
const DOCUMENTS_KEY = "documents";

const useInvalidate = () => {
  const queryClient = useQueryClient();
  return (...keys) => keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
};

export function useLetterTemplates(params = {}, options = {}) {
  return useQuery({
    queryKey: [LETTER_TEMPLATES_KEY, "list", params],
    queryFn: () => getLetterTemplates(params),
    ...options,
  });
}

export function useLetterTemplate(id, options = {}) {
  return useQuery({
    queryKey: [LETTER_TEMPLATES_KEY, "detail", id],
    queryFn: () => getLetterTemplate(id),
    enabled: Boolean(id) && options.enabled !== false,
    ...options,
  });
}

export function useLetterPlaceholders(recipientType, options = {}) {
  return useQuery({
    queryKey: [LETTER_TEMPLATES_KEY, "placeholders", recipientType],
    queryFn: () => getLetterPlaceholders(recipientType),
    enabled: Boolean(recipientType) && options.enabled !== false,
    staleTime: 10 * 60 * 1000,
    // The template editor waits on this list; a failing request must not hold it for the default ~7s of retries.
    retry: 1,
    ...options,
  });
}

export function useLetterTemplateVersions(id, options = {}) {
  return useQuery({
    queryKey: [LETTER_TEMPLATES_KEY, "versions", id],
    queryFn: () => getLetterTemplateVersions(id),
    enabled: Boolean(id) && options.enabled !== false,
    ...options,
  });
}

/**
 * Caches the template the server returned before refetching, so screens showing it never fall
 * back to the pre-save copy while the refetch is in flight.
 */
const useTemplateSaved = () => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  return (template) => {
    if (template?._id) queryClient.setQueryData([LETTER_TEMPLATES_KEY, "detail", template._id], template);
    invalidate(LETTER_TEMPLATES_KEY);
  };
};

export function useSaveLetterTemplate() {
  const onSaved = useTemplateSaved();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      id ? updateLetterTemplate(id, payload) : createLetterTemplate(payload),
    onSuccess: onSaved,
  });
}

export function useLetterTemplateAction() {
  const onSaved = useTemplateSaved();
  return useMutation({
    mutationFn: ({ action, id, value }) => {
      switch (action) {
        case "duplicate":
          return duplicateLetterTemplate(id, value);
        case "archive":
          return archiveLetterTemplate(id, Boolean(value));
        case "reset":
          return resetLetterTemplate(id);
        case "restore":
          return restoreLetterTemplateVersion(id, value);
        default:
          return Promise.reject(new Error(`Unknown template action: ${action}`));
      }
    },
    onSuccess: onSaved,
  });
}

export function useIssuedLetters(params = {}, options = {}) {
  return useQuery({
    queryKey: [ISSUED_LETTERS_KEY, "list", params],
    queryFn: () => getIssuedLetters(params),
    placeholderData: (previous) => previous,
    ...options,
  });
}

export function useLetterRecipients(params, options = {}) {
  return useQuery({
    queryKey: [ISSUED_LETTERS_KEY, "recipients", params],
    queryFn: () => getLetterRecipients(params),
    enabled: Boolean(params?.recipientType) && options.enabled !== false,
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useIssueLetter() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload) => issueLetter(payload),
    onSuccess: () => invalidate(ISSUED_LETTERS_KEY, OFFER_CANDIDATES_KEY, DOCUMENTS_KEY),
  });
}

export function useIssuedLetterAction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ action, id, reason }) => {
      if (action === "email") return emailIssuedLetter(id);
      if (action === "void") return voidIssuedLetter(id, reason);
      return Promise.reject(new Error(`Unknown letter action: ${action}`));
    },
    onSuccess: () => invalidate(ISSUED_LETTERS_KEY, DOCUMENTS_KEY),
  });
}

export function useOfferCandidates(params = {}, options = {}) {
  return useQuery({
    queryKey: [OFFER_CANDIDATES_KEY, "list", params],
    queryFn: () => getOfferCandidates(params),
    placeholderData: (previous) => previous,
    ...options,
  });
}

export function useOfferCandidate(id, options = {}) {
  return useQuery({
    queryKey: [OFFER_CANDIDATES_KEY, "detail", id],
    queryFn: () => getOfferCandidate(id),
    ...options,
    enabled: Boolean(id) && options.enabled !== false,
  });
}

export function useSaveOfferCandidate() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      id ? updateOfferCandidate(id, payload) : createOfferCandidate(payload),
    onSuccess: () => {
      invalidate(OFFER_CANDIDATES_KEY);
      // The issue panel looks people up by id; a renamed candidate must not keep the old name there.
      queryClient.invalidateQueries({ queryKey: [ISSUED_LETTERS_KEY, "recipients"] });
    },
  });
}

export function useOfferCandidateAction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ action, id, value, note }) => {
      if (action === "status") return setOfferCandidateStatus(id, value, note);
      if (action === "delete") return deleteOfferCandidate(id);
      if (action === "link") return linkOfferCandidateEmployee(id, value);
      return Promise.reject(new Error(`Unknown candidate action: ${action}`));
    },
    onSuccess: () => invalidate(OFFER_CANDIDATES_KEY),
  });
}
