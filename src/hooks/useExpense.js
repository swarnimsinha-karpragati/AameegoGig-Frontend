import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExpenseDashboard,
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  markReimbursed,
  deleteExpense,
  getExpensePolicy,
  updateExpensePolicy,
} from "../services/expenseService";

const EXPENSE_DASHBOARD_KEY = "expenseDashboard";
const EXPENSE_LIST_KEY = "expenseList";
const EXPENSE_BY_ID_KEY = "expenseById";
const EXPENSE_POLICY_KEY = "expensePolicy";

export function useExpenseDashboard(options = {}) {
  return useQuery({
    queryKey: [EXPENSE_DASHBOARD_KEY],
    queryFn: getExpenseDashboard,
    ...options,
  });
}

export function useExpenses(params = {}, options = {}) {
  return useQuery({
    queryKey: [EXPENSE_LIST_KEY, params],
    queryFn: () => getExpenses(params),
    ...options,
  });
}

export function useExpenseById(id, options = {}) {
  return useQuery({
    queryKey: [EXPENSE_BY_ID_KEY, id],
    queryFn: () => getExpenseById(id),
    enabled: Boolean(id) && (options.enabled !== false),
    ...options,
  });
}

export function useExpensePolicy(options = {}) {
  return useQuery({
    queryKey: [EXPENSE_POLICY_KEY],
    queryFn: getExpensePolicy,
    ...options,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => createExpense(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSE_DASHBOARD_KEY] });
      queryClient.invalidateQueries({ queryKey: [EXPENSE_LIST_KEY] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, formData }) => updateExpense(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSE_DASHBOARD_KEY] });
      queryClient.invalidateQueries({ queryKey: [EXPENSE_LIST_KEY] });
    },
  });
}

export function useSubmitExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => submitExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSE_DASHBOARD_KEY] });
      queryClient.invalidateQueries({ queryKey: [EXPENSE_LIST_KEY] });
    },
  });
}

export function useApproveExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }) => approveExpense(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSE_DASHBOARD_KEY] });
      queryClient.invalidateQueries({ queryKey: [EXPENSE_LIST_KEY] });
    },
  });
}

export function useRejectExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }) => rejectExpense(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSE_DASHBOARD_KEY] });
      queryClient.invalidateQueries({ queryKey: [EXPENSE_LIST_KEY] });
    },
  });
}

export function useMarkReimbursed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => markReimbursed(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSE_DASHBOARD_KEY] });
      queryClient.invalidateQueries({ queryKey: [EXPENSE_LIST_KEY] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSE_DASHBOARD_KEY] });
      queryClient.invalidateQueries({ queryKey: [EXPENSE_LIST_KEY] });
    },
  });
}

export function useUpdateExpensePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => updateExpensePolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXPENSE_POLICY_KEY] });
    },
  });
}
