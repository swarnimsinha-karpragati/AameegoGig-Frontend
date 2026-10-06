import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as service from "../../services/letterTemplateService";
import * as candidateService from "../../services/offerCandidateService";
import {
  ISSUED_LETTERS_KEY,
  LETTER_TEMPLATES_KEY,
  OFFER_CANDIDATES_KEY,
  useLetterTemplateAction,
  useSaveLetterTemplate,
  useSaveOfferCandidate,
} from "../useLetters";

jest.mock("../../services/letterTemplateService");
jest.mock("../../services/offerCandidateService");

const setup = (useHook) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { queryClient, ...renderHook(useHook, { wrapper }) };
};

const detailKey = (id) => [LETTER_TEMPLATES_KEY, "detail", id];

it("puts the saved template straight into the detail cache so the editor never shows stale content", async () => {
  const saved = { _id: "t1", version: 4, bodyHtml: "<p>new</p>" };
  service.updateLetterTemplate.mockResolvedValue(saved);
  const { queryClient, result } = setup(useSaveLetterTemplate);
  queryClient.setQueryData(detailKey("t1"), { _id: "t1", version: 3, bodyHtml: "<p>old</p>" });
  await act(() => result.current.mutateAsync({ id: "t1", payload: {} }));
  expect(queryClient.getQueryData(detailKey("t1"))).toEqual(saved);
});

it.each(["reset", "restore"])("caches the template returned by %s before refetching", async (action) => {
  const restored = { _id: "t1", version: 5, bodyHtml: "<p>restored</p>" };
  service.resetLetterTemplate.mockResolvedValue(restored);
  service.restoreLetterTemplateVersion.mockResolvedValue(restored);
  const { queryClient, result } = setup(useLetterTemplateAction);
  queryClient.setQueryData(detailKey("t1"), { _id: "t1", version: 4 });
  await act(() => result.current.mutateAsync({ action, id: "t1", value: 2, version: 4 }));
  await waitFor(() => expect(queryClient.getQueryData(detailKey("t1"))).toEqual(restored));
});

it("reset and restore pass on the version being edited", async () => {
  service.resetLetterTemplate.mockResolvedValue({ _id: "t1", version: 5 });
  service.restoreLetterTemplateVersion.mockResolvedValue({ _id: "t1", version: 5 });
  const { result } = setup(useLetterTemplateAction);
  await act(() => result.current.mutateAsync({ action: "reset", id: "t1", version: 4 }));
  expect(service.resetLetterTemplate).toHaveBeenCalledWith("t1", 4);
  await act(() => result.current.mutateAsync({ action: "restore", id: "t1", value: 2, version: 4 }));
  expect(service.restoreLetterTemplateVersion).toHaveBeenCalledWith("t1", 2, 4);
});

it("saving a candidate refreshes the candidate list, its detail and the issue-panel people lookup", async () => {
  candidateService.updateOfferCandidate.mockResolvedValue({ _id: "c1", name: "Neha S" });
  const { queryClient, result } = setup(useSaveOfferCandidate);
  const recipientsKey = [ISSUED_LETTERS_KEY, "recipients", { recipientType: "candidate", id: "c1" }];
  const detailCandidateKey = [OFFER_CANDIDATES_KEY, "detail", "c1"];
  const issuedListKey = [ISSUED_LETTERS_KEY, "list", { page: 1 }];
  [recipientsKey, detailCandidateKey, issuedListKey].forEach((key) => queryClient.setQueryData(key, {}));

  await act(() => result.current.mutateAsync({ id: "c1", payload: { name: "Neha S" } }));

  expect(queryClient.getQueryState(recipientsKey).isInvalidated).toBe(true);
  expect(queryClient.getQueryState(detailCandidateKey).isInvalidated).toBe(true);
  expect(queryClient.getQueryState(issuedListKey).isInvalidated).toBe(false);
});
