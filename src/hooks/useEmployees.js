import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEmployees,
  searchEmployees,
  addEmployee,
  bulkUploadEmployees,
  updateEmployee,
  deleteEmployee,
  getUnlinkedUsers,
  linkUserToEmployee,
  getVendorName,
  toggleAppLogin,
  resendCredentials,
  convertToEmployee,
} from "../services/employeeService";

const EMPLOYEES_QUERY_KEY = "employees";
const EMPLOYEE_SEARCH_QUERY_KEY = "employeeSearch";
const UNLINKED_USERS_QUERY_KEY = "unlinkedUsers";
const VENDOR_NAME_QUERY_KEY = "vendorName";

export function useEmployees(params = {}, options = {}) {
  return useQuery({
    queryKey: [EMPLOYEES_QUERY_KEY, params],
    queryFn: async () => {
      const res = await getEmployees(params);
      return res.data || { employees: [], pagination: { total: 0, pages: 0 } };
    },
    ...options,
  });
}

export function useAllEmployees(options = {}) {
  return useQuery({
    queryKey: [EMPLOYEES_QUERY_KEY, "all"],
    queryFn: async () => {
      const res = await getEmployees();
      return res.data?.employees || [];
    },
    ...options,
  });
}

export function useEmployeeSearch(params, options = {}) {
  return useQuery({
    queryKey: [EMPLOYEE_SEARCH_QUERY_KEY, params],
    queryFn: async () => {
      const res = await searchEmployees(params);
      return res.data || [];
    },
    enabled: !!params && Object.keys(params).some((k) => params[k]),
    ...options,
  });
}

export function useUnlinkedUsers(options = {}) {
  return useQuery({
    queryKey: [UNLINKED_USERS_QUERY_KEY],
    queryFn: async () => {
      const res = await getUnlinkedUsers();
      return res.data || [];
    },
    ...options,
  });
}

export function useVendorName(vendorId, options = {}) {
  return useQuery({
    queryKey: [VENDOR_NAME_QUERY_KEY, vendorId],
    queryFn: async () => {
      const res = await getVendorName(vendorId);
      return res.data || null;
    },
    enabled: !!vendorId,
    ...options,
  });
}

export function useAddEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => addEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_QUERY_KEY] });
    },
  });
}

export function useBulkUploadEmployees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file) => bulkUploadEmployees(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_QUERY_KEY] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_QUERY_KEY] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_QUERY_KEY] });
    },
  });
}

export function useLinkUserToEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, userId }) => linkUserToEmployee(employeeId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [UNLINKED_USERS_QUERY_KEY] });
    },
  });
}

export function useToggleAppLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enable }) => toggleAppLogin(id, enable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_QUERY_KEY] });
    },
  });
}

export function useResendCredentials() {
  return useMutation({
    mutationFn: (id) => resendCredentials(id),
  });
}

export function useConvertToEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => convertToEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_QUERY_KEY] });
    },
  });
}
