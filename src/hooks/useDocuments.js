import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDocuments,
  getEmployeeDocuments,
  uploadEmployeeDocument,
  deleteDocument,
} from "../services/documentService";

const DOCUMENTS_KEY = "documents";

export function useDocuments(params = {}, options = {}) {
  return useQuery({
    queryKey: [DOCUMENTS_KEY, params],
    queryFn: () => getDocuments(params),
    ...options,
  });
}

export function useEmployeeDocuments(employeeId, params = {}, options = {}) {
  return useQuery({
    queryKey: [DOCUMENTS_KEY, "employee", employeeId, params],
    queryFn: () => getEmployeeDocuments(employeeId, params),
    enabled: Boolean(employeeId) && (options.enabled !== false),
    ...options,
  });
}

export function useUploadEmployeeDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => uploadEmployeeDocument(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_KEY] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_KEY] });
    },
  });
}
