import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInterns,
  searchInterns,
  getInternById,
  addIntern,
  updateIntern,
  updateInternStatus,
  extendInternship,
  configureInternStipend,
  getInternDocuments,
  convertInternToEmployee,
  deleteIntern,
  restoreIntern,
  getInternStats,
} from "../services/internService";

const INTERNS_QUERY_KEY = "interns";
const INTERN_SEARCH_QUERY_KEY = "internSearch";
const INTERN_STATS_QUERY_KEY = "internStats";

export function useInterns(params = {}, options = {}) {
  return useQuery({
    queryKey: [INTERNS_QUERY_KEY, params],
    queryFn: async () => {
      const res = await getInterns(params);
      return res.data || { interns: [], pagination: { total: 0, pages: 0 } };
    },
    ...options,
  });
}

export function useInternDetail(id, options = {}) {
  return useQuery({
    queryKey: [INTERNS_QUERY_KEY, "detail", id],
    queryFn: async () => {
      const res = await getInternById(id);
      return res.data?.intern || null;
    },
    enabled: !!id,
    ...options,
  });
}

export function useInternSearch(params, options = {}) {
  return useQuery({
    queryKey: [INTERN_SEARCH_QUERY_KEY, params],
    queryFn: async () => {
      const res = await searchInterns(params);
      return res.data || { interns: [] };
    },
    enabled: !!params && Object.keys(params).some((k) => params[k]),
    ...options,
  });
}

export function useInternStats(options = {}) {
  return useQuery({
    queryKey: [INTERN_STATS_QUERY_KEY],
    queryFn: async () => {
      const res = await getInternStats();
      return res.data || {};
    },
    ...options,
  });
}

export function useInternDocuments(id, options = {}) {
  return useQuery({
    queryKey: [INTERNS_QUERY_KEY, "documents", id],
    queryFn: async () => {
      const res = await getInternDocuments(id);
      return res.data || {};
    },
    enabled: !!id,
    ...options,
  });
}

export function useAddIntern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => addIntern(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTERNS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [INTERN_STATS_QUERY_KEY] });
    },
  });
}

export function useUpdateIntern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateIntern(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTERNS_QUERY_KEY] });
    },
  });
}

export function useUpdateInternStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, remark }) => updateInternStatus(id, { status, remark }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTERNS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [INTERN_STATS_QUERY_KEY] });
    },
  });
}

export function useExtendInternship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newEndDate, remark }) => extendInternship(id, { newEndDate, remark }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTERNS_QUERY_KEY] });
    },
  });
}

export function useConfigureInternStipend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => configureInternStipend(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTERNS_QUERY_KEY] });
    },
  });
}

export function useConvertInternToEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => convertInternToEmployee(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTERNS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [INTERN_STATS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useDeleteIntern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteIntern(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTERNS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [INTERN_STATS_QUERY_KEY] });
    },
  });
}

export function useRestoreIntern() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => restoreIntern(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTERNS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [INTERN_STATS_QUERY_KEY] });
    },
  });
}
