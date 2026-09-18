import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getOtPolicies,
  getShifts,
  getEmployees as getDepartmentEmployees,
  getDepartmentName,
} from "../services/departmentService";

const DEPT_QUERY_KEY = "departments";
const SHIFT_QUERY_KEY = "shifts";
const OT_POLICY_QUERY_KEY = "otPolicies";
const DEPT_EMPLOYEES_QUERY_KEY = "departmentEmployees";
const DEPT_NAME_QUERY_KEY = "departmentNames";

export function useDepartments(vendorId, options = {}) {
  return useQuery({
    queryKey: [DEPT_QUERY_KEY, vendorId],
    queryFn: async () => {
      const res = await getDepartments(vendorId);
      return res.data || [];
    },
    enabled: !!vendorId,
    ...options,
  });
}

export function useShifts(vendorId, options = {}) {
  return useQuery({
    queryKey: [SHIFT_QUERY_KEY, vendorId],
    queryFn: async () => {
      const res = await getShifts(vendorId);
      return res.data || [];
    },
    enabled: !!vendorId,
    ...options,
  });
}

export function useOtPolicies(vendorId, options = {}) {
  return useQuery({
    queryKey: [OT_POLICY_QUERY_KEY, vendorId],
    queryFn: async () => {
      const res = await getOtPolicies(vendorId);
      return res.data || [];
    },
    enabled: !!vendorId,
    ...options,
  });
}

export function useDepartmentEmployees(vendorId, options = {}) {
  return useQuery({
    queryKey: [DEPT_EMPLOYEES_QUERY_KEY, vendorId],
    queryFn: async () => {
      const res = await getDepartmentEmployees(vendorId);
      return res.data || [];
    },
    enabled: !!vendorId,
    ...options,
  });
}

export function useDepartmentNames(vendorId, options = {}) {
  return useQuery({
    queryKey: [DEPT_NAME_QUERY_KEY, vendorId],
    queryFn: async () => {
      const res = await getDepartmentName(vendorId);
      return res.data || [];
    },
    enabled: !!vendorId,
    ...options,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => createDepartment(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [DEPT_QUERY_KEY, variables.vendorId] });
      queryClient.invalidateQueries({ queryKey: [DEPT_NAME_QUERY_KEY, variables.vendorId] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vendorId, data }) => updateDepartment(vendorId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [DEPT_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DEPT_NAME_QUERY_KEY] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vendorId) => deleteDepartment(vendorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DEPT_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [DEPT_NAME_QUERY_KEY] });
    },
  });
}
