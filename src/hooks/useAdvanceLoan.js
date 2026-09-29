import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAdvanceLoanRequest,
  getMyRequests,
  getAllRequests,
  getRequestDetails,
  cancelRequest,
  approveRequest,
  deferDeduction,
  rejectRequest,
  updateRepayment,
  recordPayment,
  getStatistics,
  addComment,
  getLoanConfig,
  updateLoanConfig,
  getLoanStatistics,
} from "../services/advanceLoanService";

const ADVANCE_LOAN_KEY = "advanceLoan";
const LOAN_CONFIG_KEY = "loanConfig";
const LOAN_STATISTICS_KEY = "loanStatistics";

export function useAdvanceLoanStatistics(options = {}) {
  return useQuery({
    queryKey: [ADVANCE_LOAN_KEY, "statistics"],
    queryFn: getStatistics,
    ...options,
  });
}

export function useAdvanceLoanMyRequests(params = {}, options = {}) {
  return useQuery({
    queryKey: [ADVANCE_LOAN_KEY, "my", params],
    queryFn: () => getMyRequests(params),
    ...options,
  });
}

export function useAdvanceLoanAllRequests(params = {}, options = {}) {
  return useQuery({
    queryKey: [ADVANCE_LOAN_KEY, "all", params],
    queryFn: () => getAllRequests(params),
    ...options,
  });
}

export function useAdvanceLoanRequestDetails(id, options = {}) {
  return useQuery({
    queryKey: [ADVANCE_LOAN_KEY, "detail", id],
    queryFn: () => getRequestDetails(id),
    enabled: Boolean(id) && (options.enabled !== false),
    ...options,
  });
}

export function useCreateAdvanceLoanRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => createAdvanceLoanRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADVANCE_LOAN_KEY] });
    },
  });
}

export function useCancelAdvanceLoanRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => cancelRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADVANCE_LOAN_KEY] });
    },
  });
}

export function useApproveAdvanceLoanRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }) => approveRequest(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADVANCE_LOAN_KEY] });
    },
  });
}

export function useRejectAdvanceLoanRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }) => rejectRequest(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADVANCE_LOAN_KEY] });
    },
  });
}

export function useDeferAdvanceLoanDeduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }) => deferDeduction(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADVANCE_LOAN_KEY] });
    },
  });
}

export function useRecordAdvanceLoanPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, paymentData }) => recordPayment(id, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADVANCE_LOAN_KEY] });
    },
  });
}

export function useUpdateAdvanceLoanRepayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateRepayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADVANCE_LOAN_KEY] });
    },
  });
}

export function useAddAdvanceLoanComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }) => addComment(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADVANCE_LOAN_KEY] });
    },
  });
}

export function useLoanConfig(options = {}) {
  return useQuery({
    queryKey: [LOAN_CONFIG_KEY],
    queryFn: getLoanConfig,
    ...options,
  });
}

export function useUpdateLoanConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => updateLoanConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOAN_CONFIG_KEY] });
      queryClient.invalidateQueries({ queryKey: [LOAN_STATISTICS_KEY] });
    },
  });
}

export function useLoanStatistics(options = {}) {
  return useQuery({
    queryKey: [LOAN_STATISTICS_KEY],
    queryFn: getLoanStatistics,
    ...options,
  });
}
