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
import { roleHasPermission } from "../utils/roles";
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

// Permission editor: shows auto baseline + HR/Admin elevated checkboxes
function PermEditor({ permissions, setPermissions, viewOnly }) {
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
    const keys = group.perms.map((p) => p.key);
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
                    {viewOnly ? (
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
                      htmlFor={viewOnly ? undefined : `${group.key}-${p.key}`}
                      style={viewOnly && !permissions.has(p.key) ? { color: "#cbd5e1" } : undefined}
                    >
                      {p.label}
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

function EditModal({ role, roleName, onSave, onClose }) {
  const [permissions, setPermissions] = useState(() => new Set(role.permissions || []));

  return (
    <div className="roles-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="roles-modal" role="dialog" aria-modal="true">
        <div className="roles-modal-header">
          <h3>Edit Permissions — {role.displayName || roleName}</h3>
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
          <PermEditor permissions={permissions} setPermissions={setPermissions} viewOnly={false} />
        </div>
        <div className="roles-modal-footer">
          <button type="button" className="roles-modal-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="roles-modal-save-btn"
            onClick={() => onSave(roleName, [...permissions])}
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

  const handleSavePermissions = async (roleName, permissions) => {
    const roleDef = roles[roleName];
    const updated = {
      ...roles,
      [roleName]: {
        ...roleDef,
        permissions,
      },
    };
    persistRoles(updated);
    if (roleDef?._id) {
      try {
        const response = await updateRole(roleDef._id, {
          roleName,
          displayName: roleDef.displayName || roleName,
          description: roleDef.description || "",
          permissions,
        });
        const savedRole = response.data?.role;
        if (savedRole?.roleName) {
          const refreshed = {
            ...updated,
            [savedRole.roleName]: {
              ...updated[savedRole.roleName],
              ...savedRole,
            },
          };
          persistRoles(refreshed);
        }
        setFeedback({ type: "success", message: `${roleDef.displayName || roleName} permissions updated successfully.` });
      } catch (error) {
        console.error("Sync role permissions failed:", error);
        setFeedback({ type: "error", message: error.response?.data?.message || "Permissions could not be saved to the server." });
        alert(error.response?.data?.message || "Permissions updated locally, but could not be saved to the server.");
      }
    } else {
      setFeedback({ type: "success", message: `${roleDef.displayName || roleName} permissions updated successfully.` });
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

  const handleCreateRole = async () => {
    // Role keys must not contain spaces — "Finance TEAM" becomes
    // "Finance_TEAM" (mirrors backend normalizeRoleName).
    const name = newRoleName.trim().replace(/\s+/g, "_");
    if (!name) return;
    if (roles[name]) {
      alert("A role with this name already exists");
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
      }
    } catch (error) {
      console.error("Sync role create failed:", error);
      alert(error.response?.data?.message || "Role saved locally, but could not be saved to the server.");
    }
    setNewRoleName("");
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
          <div>
            <h1>Roles & Permissions</h1>
            <p>
              HR/Admin features can be assigned to any role. Admin always has full access.
            </p>
          </div>
          <button type="button" className="roles-page-add-btn" onClick={() => setShowCreate(true)}>
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
                <button type="button" className="roles-modal-close" onClick={() => setShowCreate(false)} aria-label="Close">
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
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="e.g. Finance Team, Payroll Officer"
                        className="dynamic-input"
                      />
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

                <PermEditor permissions={newRolePerms} setPermissions={setNewRolePerms} viewOnly={false} />
              </div>

              <div className="roles-modal-footer">
                <button type="button" className="roles-modal-cancel-btn" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="roles-modal-save-btn"
                  disabled={!newRoleName.trim()}
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