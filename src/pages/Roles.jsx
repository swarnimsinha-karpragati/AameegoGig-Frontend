import { useState, useMemo, useCallback, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import {
  ShieldCheck,
  Eye,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  Users,
  Plus,
  Lock,
  CheckCircle2,
} from "lucide-react";
import {
  BASELINE_GROUPS,
  BASELINE_PERMISSIONS,
  ELEVATED_GROUPS,
  loadRoles,
  saveRoles,
} from "../utils/permissions";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../services/roleService";
import { roleHasPermission, syncRolesFromServer } from "../utils/roles";
import ConfirmModal from "../components/ConfirmModal";
import "./Roles.css";

const ROLE_ICON_COLORS = {
  HR: "hr",
  Manager: "manager",
  Employee: "employee",
};

function getIconColor(roleName) {
  return ROLE_ICON_COLORS[roleName] || "custom";
}

// Role name rules (mirrors backend normalizeRoleName + createRole checks):
// spaces become underscores, 3–50 chars, letters/numbers/spaces/_/- only.
function validateRoleName(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "Role name is required.";
  const normalized = trimmed.replace(/\s+/g, "_");
  if (normalized.length < 3) return "Role name must be at least 3 characters.";
  if (normalized.length > 50) return "Role name must be 50 characters or less.";
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]*$/.test(trimmed)) {
    return "Role name can only contain letters, numbers, spaces, underscores and hyphens.";
  }
  return "";
}

// Permission editor: shows auto baseline + HR/Admin elevated checkboxes.
// lockedPerms renders as a padlock (used to keep roles:manage off system roles).
function PermEditor({ permissions, setPermissions, viewOnly, lockedPerms }) {
  const locked = lockedPerms || new Set();
  const [openModules, setOpenModules] = useState(() => {
    const initial = {};
    ELEVATED_GROUPS.forEach((g) => {
      initial[g.key] = true;
    });
    return initial;
  });

  const toggleModule = (key) => {
    setOpenModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePerm = (permKey) => {
    if (viewOnly) return;
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permKey)) next.delete(permKey);
      else next.add(permKey);
      return next;
    });
  };

  const toggleGroupAll = (group) => {
    if (viewOnly) return;
    // Locked (restricted) permissions can never be bulk-granted.
    const keys = group.perms.map((p) => p.key).filter((k) => !locked.has(k));
    const allSelected = keys.every((k) => permissions.has(k));
    setPermissions((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => {
        if (allSelected) next.delete(k);
        else next.add(k);
      });
      return next;
    });
  };

  return (
    <>
      {/* Employee baseline (auto) */}
      {BASELINE_GROUPS.map((group) => {
        const selected = group.perms.filter((p) => permissions.has(p.key)).length;
        return (
          <div key={group.label} className="roles-perm-module">
            <div className="roles-perm-module-header roles-perm-module-header--baseline">
              <div className="roles-perm-module-left">
                <CheckCircle2 size={16} color="#059669" />
                <span className="roles-perm-module-name">{group.label}</span>
                <span className="roles-perm-module-count">
                  ({selected}/{group.perms.length})
                </span>
              </div>
              <span className="roles-baseline-badge">Auto granted</span>
            </div>
            <div className="roles-perm-module-body">
              {group.perms.map((p) => (
                <div key={p.key} className="roles-perm-item">
                  <Lock size={12} color="#94a3b8" />
                  <label style={{ color: "#64748b" }}>{p.key}</label>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* HR / Admin elevated features */}
      <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", margin: "18px 0 8px" }}>
        HR / Admin Features
      </div>

      {ELEVATED_GROUPS.map((group) => {
        const selectedCount = group.perms.filter((p) => permissions.has(p.key)).length;
        const allSelected = selectedCount === group.perms.length;
        const someSelected = selectedCount > 0 && !allSelected;
        const isOpen = openModules[group.key];

        return (
          <div key={group.key} className="roles-perm-module">
            <div className="roles-perm-module-header" onClick={() => toggleModule(group.key)}>
              <div className="roles-perm-module-left">
                <ChevronRight
                  size={16}
                  className={`roles-perm-module-chevron ${isOpen ? "roles-perm-module-chevron--open" : ""}`}
                />
                <span className="roles-perm-module-name">{group.label}</span>
                <span className="roles-perm-module-count">
                  ({selectedCount}/{group.perms.length})
                </span>
              </div>
              {!viewOnly && (
                <div className="roles-perm-module-toggle" onClick={(e) => e.stopPropagation()}>
                  <label>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={() => toggleGroupAll(group)}
                    />
                    {" "}All
                  </label>
                </div>
              )}
            </div>
            {isOpen && (
              <div className="roles-perm-module-body">
                {group.perms.map((p) => (
                  <div key={p.key} className="roles-perm-item">
                    {viewOnly || locked.has(p.key) ? (
                      <ShieldCheck size={12} color={permissions.has(p.key) ? "#3b82f6" : "#cbd5e1"} />
                    ) : (
                      <input
                        type="checkbox"
                        id={`${group.key}-${p.key}`}
                        checked={permissions.has(p.key)}
                        onChange={() => togglePerm(p.key)}
                      />
                    )}
                    <label
                      htmlFor={viewOnly || locked.has(p.key) ? undefined : `${group.key}-${p.key}`}
                      style={viewOnly && !permissions.has(p.key) ? { color: "#cbd5e1" } : undefined}
                      title={locked.has(p.key) ? "Restricted for system roles" : undefined}
                    >
                      {p.label}
                      {locked.has(p.key) ? " (restricted)" : ""}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function ViewModal({ role, roleName, onClose }) {
  const perms = useMemo(() => new Set(role.permissions || []), [role.permissions]);
  return (
    <div className="roles-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="roles-modal" role="dialog" aria-modal="true">
        <div className="roles-modal-header">
          <h3>View Role Permissions</h3>
          <button type="button" className="roles-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="roles-modal-body">
          <div className="roles-modal-role-info">
            <div className={`roles-modal-role-icon roles-card-icon--${getIconColor(roleName)}`}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="roles-modal-role-name">{role.displayName || roleName}</h4>
              <p className="roles-modal-role-desc">{role.description}</p>
            </div>
            <span className="roles-modal-perm-count">{role.permissions?.length || 0} permissions</span>
          </div>
          <PermEditor permissions={perms} setPermissions={() => { }} viewOnly />
        </div>
        <div className="roles-modal-footer">
          <button type="button" className="roles-modal-cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ role, roleName, existingNames, onSave, onClose }) {
  const [permissions, setPermissions] = useState(() => new Set(role.permissions || []));
  const [initialPermissions] = useState(() => new Set(role.permissions || []));
  const [editName, setEditName] = useState(roleName);
  const [editDesc, setEditDesc] = useState(role.description || "");
  const [editNameError, setEditNameError] = useState("");

  const isSystem = Boolean(role.isSystem);
  // roles:manage must never be grantable to seeded system roles — handing it
  // to Employee would escalate every holder to role admin.
  const lockedPerms = useMemo(
    () => (isSystem ? new Set(["roles:manage"]) : new Set()),
    [isSystem]
  );

  // Save stays disabled until a field or permission is changed.
  const permsChanged = useMemo(() => {
    if (permissions.size !== initialPermissions.size) return true;
    for (const perm of permissions) {
      if (!initialPermissions.has(perm)) return true;
    }
    return false;
  }, [permissions, initialPermissions]);

  const normalizedEditName = editName.trim().replace(/\s+/g, "_");
  const metaChanged =
    (!isSystem && normalizedEditName !== roleName) ||
    editDesc.trim() !== (role.description || "");
  const hasChanges = permsChanged || metaChanged;

  const handleSave = () => {
    if (!isSystem) {
      const nameError = validateRoleName(editName);
      if (nameError) {
        setEditNameError(nameError);
        return;
      }
      if (normalizedEditName !== roleName && (existingNames || []).includes(normalizedEditName)) {
        setEditNameError("A role with this name already exists.");
        return;
      }
    }
    setEditNameError("");
    onSave(roleName, [...permissions], {
      roleName: isSystem ? roleName : normalizedEditName,
      description: editDesc.trim(),
    });
  };

  return (
    <div className="roles-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="roles-modal" role="dialog" aria-modal="true">
        <div className="roles-modal-header">
          <h3>Edit Role — {role.displayName || roleName}</h3>
          <button type="button" className="roles-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="roles-modal-body">
          <div className="roles-modal-role-info">
            <div className={`roles-modal-role-icon roles-card-icon--${getIconColor(roleName)}`}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="roles-modal-role-name">{role.displayName || roleName}</h4>
              <p className="roles-modal-role-desc">{role.description}</p>
            </div>
            <span className="roles-modal-perm-count">{permissions.size} selected</span>
          </div>
          <div className="roles-perm-module" style={{ marginBottom: "16px" }}>
            <div className="roles-perm-module-header" style={{ cursor: "default" }}>
              <div className="roles-perm-module-left">
                <span className="roles-perm-module-name">Role Details</span>
              </div>
            </div>
            <div style={{ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Role Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => { setEditName(e.target.value); setEditNameError(isSystem ? "" : validateRoleName(e.target.value)); }}
                  placeholder="e.g. Finance Team"
                  className={`dynamic-input${editNameError ? " dynamic-input--error" : ""}`}
                  disabled={isSystem}
                  aria-invalid={Boolean(editNameError)}
                  maxLength={60}
                />
                {isSystem ? (
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>System role names cannot be changed.</p>
                ) : (
                  <p className={`roles-field-error${editNameError ? "" : " roles-field-error--empty"}`} role={editNameError ? "alert" : undefined}>{editNameError || " "}</p>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Brief description of this role"
                  className="dynamic-input"
                  maxLength={200}
                />
              </div>
            </div>
          </div>
          {isSystem ? (
            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 8px" }}>
              “Manage Roles & Permissions (Admin)” is restricted for system roles and cannot be granted here.
            </p>
          ) : null}
          <PermEditor permissions={permissions} setPermissions={setPermissions} viewOnly={false} lockedPerms={lockedPerms} />
        </div>
        <div className="roles-modal-footer">
          <button type="button" className="roles-modal-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="roles-modal-save-btn"
            disabled={!hasChanges}
            title={hasChanges ? undefined : "Change a field or permission to save"}
            onClick={handleSave}
          >
            Save Permissions
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Roles() {
  const [roles, setRoles] = useState(() => loadRoles());
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const [viewRole, setViewRole] = useState(null);
  const [editRole, setEditRole] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // Role delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [newRoleName, setNewRoleName] = useState("");
  const [roleNameError, setRoleNameError] = useState("");
  const [permError, setPermError] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRolePerms, setNewRolePerms] = useState(() => new Set(BASELINE_PERMISSIONS));

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const isAdmin = roleHasPermission(user?.role, "roles:manage");

  const persistRoles = useCallback((updated) => {
    setRoles(updated);
    saveRoles(updated);
  }, []);

  useEffect(() => {
    let mounted = true;
    getRoles()
      .then((backendRoles) => {
        if (!mounted || !Array.isArray(backendRoles)) return;
        const merged = { ...loadRoles() };
        backendRoles.forEach((rb) => {
          if (rb.isAdmin) return;
          merged[rb.roleName] = {
            displayName: rb.displayName || rb.roleName,
            description: rb.description || "",
            permissions: rb.permissions || [],
            baselinePermissions: rb.baselinePermissions || BASELINE_PERMISSIONS,
            isSystem: Boolean(rb.isSystem),
            isAdmin: Boolean(rb.isAdmin),
            _id: rb._id,
          };
        });
        setRoles(merged);
        saveRoles(merged);
      })
      .catch(() => {
        /* backend unavailable — keep local roles */
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSavePermissions = async (roleName, permissions, meta = {}) => {
    const roleDef = roles[roleName];
    const requestedKey = (meta.roleName || "").trim().replace(/\s+/g, "_") || roleName;
    const newDescription = meta.description !== undefined ? meta.description : (roleDef.description || "");
    const renamed = requestedKey !== roleName;
    const updated = { ...roles };
    if (renamed) delete updated[roleName];
    updated[requestedKey] = {
      ...roleDef,
      displayName: renamed ? requestedKey : (roleDef.displayName || roleName),
      description: newDescription,
      permissions,
    };
    persistRoles(updated);
    if (roleDef?._id) {
      try {
        const response = await updateRole(roleDef._id, {
          roleName: requestedKey,
          displayName: renamed ? requestedKey : (roleDef.displayName || roleName),
          description: newDescription,
          permissions,
        });
        const savedRole = response.data?.role;
        if (savedRole?.roleName) {
          const refreshed = { ...updated };
          if (savedRole.roleName !== requestedKey) delete refreshed[requestedKey];
          refreshed[savedRole.roleName] = {
            ...refreshed[savedRole.roleName],
            ...savedRole,
          };
          persistRoles(refreshed);
        }
        setFeedback({ type: "success", message: `${requestedKey} updated successfully.` });
        // Push the fresh catalog to every component immediately.
        syncRolesFromServer(true);
      } catch (error) {
        console.error("Sync role permissions failed:", error);
        setFeedback({ type: "error", message: error.response?.data?.message || "Permissions could not be saved to the server." });
        alert(error.response?.data?.message || "Permissions updated locally, but could not be saved to the server.");
      }
    } else {
      setFeedback({ type: "success", message: `${requestedKey} updated successfully.` });
    }
    setEditRole(null);
  };

  const handleConfirmDeleteRole = async () => {
    if (!deleteTarget) return;
    const roleName = deleteTarget;
    if (roles[roleName]?.isSystem) {
      setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    const roleDef = roles[roleName];
    const { [roleName]: _, ...rest } = roles;
    persistRoles(rest);
    if (roleDef?._id) {
      try {
        const res = await deleteRole(roleDef._id);
        const reassigned = res.data?.reassignedCount;
        setFeedback({
          type: "success",
          message:
            res.data?.message ||
            (reassigned > 0
              ? `Role deleted. ${reassigned} user${reassigned === 1 ? "" : "s"} moved to the Employee role.`
              : "Role deleted. Users on this role were moved to the Employee role."),
        });
        syncRolesFromServer(true);
      } catch (error) {
        console.error("Sync role delete failed:", error);
        alert(error.response?.data?.message || "Role removed locally, but could not be deleted from the server.");
      }
    } else {
      setFeedback({ type: "success", message: "Role deleted. Users on this role were moved to the Employee role." });
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  // A new role must grant something beyond the default Employee baseline —
  // otherwise it is indistinguishable from the Employee role.
  const hasElevatedPerms = (perms) =>
    [...perms].some((perm) => !BASELINE_PERMISSIONS.includes(perm));

  const handleCreateRole = async () => {
    const validationError = validateRoleName(newRoleName);
    if (validationError) {
      setRoleNameError(validationError);
      return;
    }
    setRoleNameError("");
    if (!hasElevatedPerms(newRolePerms)) {
      setPermError("Please select at least one permission.");
      return;
    }
    setPermError("");
    // Role keys must not contain spaces — "Finance TEAM" becomes
    // "Finance_TEAM" (mirrors backend normalizeRoleName).
    const name = newRoleName.trim().replace(/\s+/g, "_");
    if (!name) return;
    if (roles[name]) {
      setRoleNameError("A role with this name already exists.");
      return;
    }
    const updated = {
      ...roles,
      [name]: {
        displayName: name,
        description: newRoleDesc.trim() || "Custom role",
        isSystem: false,
        permissions: [...newRolePerms],
      },
    };
    persistRoles(updated);
    try {
      const res = await createRole({
        roleName: name,
        displayName: name,
        description: newRoleDesc.trim() || "Custom role",
        permissions: [...newRolePerms],
        baselinePermissions: BASELINE_PERMISSIONS,
      });
      const dbRole = res.data?.role;
      if (dbRole?.roleName) {
        persistRoles({
          ...updated,
          [dbRole.roleName]: {
            ...updated[dbRole.roleName],
            _id: dbRole._id,
          },
        });
        syncRolesFromServer(true);
      }
    } catch (error) {
      console.error("Sync role create failed:", error);
      const status = error.response?.status;
      const serverMessage = error.response?.data?.message || "";
      // Duplicate (or validation) rejections highlight the field inline.
      if (status === 409 || status === 400) {
        // Roll back the optimistic local add — the server rejected it.
        const rolledBack = { ...roles };
        delete rolledBack[name];
        persistRoles(rolledBack);
        setRoleNameError(serverMessage || "A role with this name already exists.");
        return;
      }
      alert(serverMessage || "Role saved locally, but could not be saved to the server.");
    }
    setNewRoleName("");
    setRoleNameError("");
    setPermError("");
    setNewRoleDesc("");
    setNewRolePerms(new Set(BASELINE_PERMISSIONS));
    setShowCreate(false);
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="roles-page">
          <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
            <ShieldCheck size={48} color="#cbd5e1" style={{ marginBottom: "1rem" }} />
            <h2 style={{ color: "#1e293b", fontWeight: 700 }}>Access Restricted</h2>
            <p>Only administrators can manage roles and permissions.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Admin role hidden from the list — full access by default
  const visibleRoles = Object.entries(roles).filter(
    ([roleName, role]) => !(role?.isAdmin || roleName === "Admin")
  );

  return (
    <MainLayout>
      <div className="roles-page">
        <div className="roles-page-header">
          <button type="button" className="roles-page-add-btn" onClick={() => { setRoleNameError(""); setPermError(""); setShowCreate(true); }}>
            <Plus size={16} />
            Create Role
          </button>
        </div>

        {feedback ? (
          <div
            role="status"
            style={{
              marginBottom: "16px",
              padding: "12px 14px",
              borderRadius: "8px",
              color: feedback.type === "success" ? "#166534" : "#991b1b",
              background: feedback.type === "success" ? "#dcfce7" : "#fee2e2",
              border: `1px solid ${feedback.type === "success" ? "#86efac" : "#fecaca"}`,
            }}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="roles-card-grid">
          {visibleRoles.map(([roleName, role]) => {
            const permCount = role.permissions.length;
            const previewPerms = role.permissions.slice(0, 4);
            const remaining = permCount - previewPerms.length;

            return (
              <div key={roleName} className="roles-card-item">
                <div className="roles-card-top">
                  <div className="roles-card-info">
                    <div className={`roles-card-icon roles-card-icon--${getIconColor(roleName)}`}>
                      {roleName === "Employee" ? <Users size={18} /> : <ShieldCheck size={18} />}
                    </div>
                    <div>
                      <h3 className="roles-card-name">{role.displayName || roleName}</h3>
                      <p className="roles-card-desc">{role.description}</p>
                    </div>
                  </div>
                  <span className={`roles-card-badge roles-card-badge--${role.isSystem ? "system" : "custom"}`}>
                    {role.isSystem ? "System" : "Custom"}
                  </span>
                </div>

                <div className="roles-card-perms">
                  {previewPerms.map((perm) => (
                    <span key={perm} className="roles-card-perm-tag">
                      {perm}
                    </span>
                  ))}
                  {remaining > 0 && (
                    <span className="roles-card-perm-tag roles-card-perm-tag--more">
                      +{remaining} more
                    </span>
                  )}
                </div>

                <div className="roles-card-actions">
                  <button type="button" className="roles-card-view-btn" onClick={() => setViewRole({ roleName, role })}>
                    <Eye size={14} />
                    View
                  </button>
                  <button type="button" className="roles-card-edit-btn" onClick={() => setEditRole({ roleName, role })}>
                    <Pencil size={14} />
                    Edit
                  </button>
                  {!role.isSystem && (
                    <button type="button" className="roles-card-delete-btn" onClick={() => setDeleteTarget(roleName)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {viewRole && (
          <ViewModal role={viewRole.role} roleName={viewRole.roleName} onClose={() => setViewRole(null)} />
        )}

        {editRole && (
          <EditModal
            role={editRole.role}
            roleName={editRole.roleName}
            existingNames={Object.keys(roles)}
            onSave={handleSavePermissions}
            onClose={() => setEditRole(null)}
          />
        )}

        <ConfirmModal
          open={!!deleteTarget}
          title={`Delete role "${(deleteTarget && roles[deleteTarget]?.displayName) || deleteTarget || ""}"?`}
          variant="danger"
          confirmLabel="Delete Role"
          loading={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleConfirmDeleteRole}
          message={
            <span>
              This role will be permanently deleted. Employees who were assigned
              this role will automatically be moved to the <strong>Employee</strong> role.
            </span>
          }
        />

        {showCreate && (
          <div className="roles-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
            <div className="roles-modal" role="dialog" aria-modal="true">
              <div className="roles-modal-header">
                <h3>Create New Role</h3>
                <button type="button" className="roles-modal-close" onClick={() => { setShowCreate(false); setRoleNameError(""); setPermError(""); }} aria-label="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="roles-modal-body">
                <div className="roles-perm-module" style={{ marginBottom: "16px" }}>
                  <div className="roles-perm-module-header" style={{ cursor: "default" }}>
                    <div className="roles-perm-module-left">
                      <Users size={16} color="#3b82f6" />
                      <span className="roles-perm-module-name">Role Details</span>
                    </div>
                  </div>
                  <div style={{ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Role Name *</label>
                      <input
                        type="text"
                        value={newRoleName}
                        onChange={(e) => { setNewRoleName(e.target.value); setRoleNameError(validateRoleName(e.target.value)); }}
                        placeholder="e.g. Finance Team, Payroll Officer"
                        className={`dynamic-input${roleNameError ? " dynamic-input--error" : ""}`}
                        aria-invalid={Boolean(roleNameError)}
                        maxLength={60}
                      />
                      <p className={`roles-field-error${roleNameError ? "" : " roles-field-error--empty"}`} role={roleNameError ? "alert" : undefined}>{roleNameError || " "}</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Description</label>
                      <input
                        type="text"
                        value={newRoleDesc}
                        onChange={(e) => setNewRoleDesc(e.target.value)}
                        placeholder="Brief description of this role"
                        className="dynamic-input"
                      />
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>
                  Permissions
                  <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: "12px", marginLeft: "8px" }}>
                    (Employee access already pre-selected)
                  </span>
                </div>
                <p className={`roles-field-error${permError ? "" : " roles-field-error--empty"}`} role={permError ? "alert" : undefined}>{permError || " "}</p>

                <PermEditor permissions={newRolePerms} setPermissions={(updater) => { setPermError(""); setNewRolePerms(updater); }} viewOnly={false} />
              </div>

              <div className="roles-modal-footer">
                <button type="button" className="roles-modal-cancel-btn" onClick={() => { setShowCreate(false); setRoleNameError(""); setPermError(""); }}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="roles-modal-save-btn"
                  disabled={!newRoleName.trim() || Boolean(validateRoleName(newRoleName))}
                  onClick={handleCreateRole}
                >
                  Create Role
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}