import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRoles,
  getSession,
  seedRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../services/roleService";

const ROLES_KEY = "roles";
const SESSION_KEY = "session";

export function useRoles(options = {}) {
  return useQuery({
    queryKey: [ROLES_KEY],
    queryFn: getRoles,
    ...options,
  });
}

export function useSession(options = {}) {
  return useQuery({
    queryKey: [SESSION_KEY],
    queryFn: getSession,
    ...options,
  });
}

export function useSeedRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => seedRoles(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_KEY] });
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_KEY] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => updateRole(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_KEY] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_KEY] });
    },
  });
}
