import { useState, useMemo, useCallback } from "react";
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
  FolderPlus,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  DEFAULT_ROLES,
  getFullPermissionCatalog,
  getPermissionCountForModule,
  loadCustomModules,
  saveCustomModules,
} from "../utils/permissions";
import "./Roles.css";

const ROLE_ICON_COLORS = {
  Admin: "admin",
  HR: "hr",
  Manager: "manager",
  Employee: "employee",
};

function getIconColor(roleName) {
  return ROLE_ICON_COLORS[roleName] || "custom";
}

const permKeyOf = (modKey, subKey, actionKey) =>
  actionKey ? `${modKey}:${subKey}:${actionKey}` : null;

// --------------------- Add Dynamic Menu Modal ---------------------

function AddDynamicModal({ catalog, onAdd, onClose }) {
  const [type, setType] = useState("module");
  const [modKey, setModKey] = useState("");
  const [modLabel, setModLabel] = useState("");
  const [subKey, setSubKey] = useState("");
  const [subLabel, setSubLabel] = useState("");
  const [actionKey, setActionKey] = useState("");
  const [actionLabel, setActionLabel] = useState("");

  const usedModuleKeys = Object.keys(catalog);
  const selectedMod = catalog[modKey];

  const handleSubmit = () => {
    if (type === "module") {
      const key = modKey.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
      if (!key || !modLabel.trim()) return;
      onAdd({
        type: "module",
        key,
        label: modLabel.trim(),
      });
    } else if (type === "subModule") {
      const key = subKey.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
      if (!modKey || !key || !subLabel.trim()) return;
      onAdd({
        type: "subModule",
        moduleKey: modKey,
        key,
        label: subLabel.trim(),
      });
    } else {
      const key = actionKey.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
      if (!modKey || !subKey || !key || !actionLabel.trim()) return;
      onAdd({
        type: "action",
        moduleKey: modKey,
        subModuleKey: subKey,
        key,
        label: actionLabel.trim(),
      });
    }
  };

  return (
    <div className="roles-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="roles-modal roles-modal--sm" role="dialog" aria-modal="true">
        <div className="roles-modal-header">
          <h3>Add New <span style={{ textTransform: "capitalize" }}>{type === "module" ? "Module" : type === "subModule" ? "Sub-Module / View" : "Action / View"}</span></h3>
          <button type="button" className="roles-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="roles-modal-body">
          <div className="dynamic-type-tabs">
            {[
              { value: "module", label: "Module", icon: <FolderPlus size={14} /> },
              { value: "subModule", label: "Sub-Module / Tab", icon: <Layers size={14} /> },
              { value: "action", label: "Action / Button", icon: <Sparkles size={14} /> },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                className={`dynamic-type-tab ${type === t.value ? "dynamic-type-tab--active" : ""}`}
                onClick={() => setType(t.value)}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="dynamic-form">
            {type === "module" ? (
              <>
                <div className="roles-perm-item" style={{ padding: "6px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Module Key (unique id) *</label>
                    <input
                      type="text"
                      value={modKey}
                      onChange={(e) => setModKey(e.target.value)}
                      placeholder="e.g. helpdesk"
                      className="dynamic-input"
                    />
                    {usedModuleKeys.includes(modKey.trim().toLowerCase()) && (
                      <span style={{ color: "#ef4444", fontSize: "12px" }}>This module already exists</span>
                    )}
                  </div>
                </div>
                <div className="roles-perm-item" style={{ padding: "6px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Module Label (display name) *</label>
                    <input
                      type="text"
                      value={modLabel}
                      onChange={(e) => setModLabel(e.target.value)}
                      placeholder="e.g. Help Desk"
                      className="dynamic-input"
                    />
                  </div>
                </div>
              </>
            ) : type === "subModule" ? (
              <>
                <div className="roles-perm-item" style={{ padding: "6px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Parent Module *</label>
                    <select
                      value={modKey}
                      onChange={(e) => setModKey(e.target.value)}
                      className="dynamic-input"
                    >
                      <option value="">-- Select Module --</option>
                      {usedModuleKeys.map((k) => (
                        <option key={k} value={k}>{catalog[k]?.label || k}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="roles-perm-item" style={{ padding: "6px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Sub-Module / Tab Key *</label>
                    <input
                      type="text"
                      value={subKey}
                      onChange={(e) => setSubKey(e.target.value)}
                      placeholder="e.g. tickets"
                      className="dynamic-input"
                    />
                  </div>
                </div>
                <div className="roles-perm-item" style={{ padding: "6px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Sub-Module Label *</label>
                    <input
                      type="text"
                      value={subLabel}
                      onChange={(e) => setSubLabel(e.target.value)}
                      placeholder="e.g. Ticket List"
                      className="dynamic-input"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="roles-perm-item" style={{ padding: "6px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Parent Module *</label>
                    <select
                      value={modKey}
                      onChange={(e) => { setModKey(e.target.value); setSubKey(""); }}
                      className="dynamic-input"
                    >
                      <option value="">-- Select Module --</option>
                      {usedModuleKeys.map((k) => (
                        <option key={k} value={k}>{catalog[k]?.label || k}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="roles-perm-item" style={{ padding: "6px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Parent Sub-Module / Tab *</label>
                    <select
                      value={subKey}
                      onChange={(e) => setSubKey(e.target.value)}
                      className="dynamic-input"
                      disabled={!modKey}
                    >
                      <option value="">-- Select Sub-Module --</option>
                      {selectedMod &&
                        Object.entries(selectedMod.subModules).map(([sk, sv]) => (
                          <option key={sk} value={sk}>{sv.label || sk}</option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="roles-perm-item" style={{ padding: "6px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Action Key *</label>
                    <input
                      type="text"
                      value={actionKey}
                      onChange={(e) => setActionKey(e.target.value)}
                      placeholder="e.g. open-ticket"
                      className="dynamic-input"
                    />
                  </div>
                </div>
                <div className="roles-perm-item" style={{ padding: "6px 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Action Label *</label>
                    <input
                      type="text"
                      value={actionLabel}
                      onChange={(e) => setActionLabel(e.target.value)}
                      placeholder="e.g. Open Ticket"
                      className="dynamic-input"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="roles-modal-footer">
          <button type="button" className="roles-modal-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="roles-modal-save-btn" onClick={handleSubmit}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------- Permission Editor (nested module > sub-module > action) ---------------------

function PermEditor({ catalog, perms, setPerms, viewOnly }) {
  const [openModules, setOpenModules] = useState(() => {
    const initial = {};
    Object.keys(catalog).forEach((k) => {
      initial[k] = true;
    });
    return initial;
  });
  const [openSubs, setOpenSubs] = useState(() => {
    const initial = {};
    Object.keys(catalog).forEach((k) => {
      initial[k] = {};
      Object.keys(catalog[k].subModules).forEach((sk) => {
        initial[k][sk] = true;
      });
    });
    return initial;
  });

  const toggleModule = (modKey) => {
    setOpenModules((prev) => ({ ...prev, [modKey]: !prev[modKey] }));
  };

  const toggleSub = (modKey, subKey) => {
    setOpenSubs((prev) => ({
      ...prev,
      [modKey]: { ...prev[modKey], [subKey]: !prev[modKey]?.[subKey] },
    }));
  };

  const togglePerm = (permKey) => {
    if (viewOnly) return;
    setPerms((prev) => {
      const next = new Set(prev);
      if (next.has(permKey)) next.delete(permKey);
      else next.add(permKey);
      return next;
    });
  };

  const toggleSubAll = (modKey, subKey) => {
    if (viewOnly) return;
    const sub = catalog[modKey].subModules[subKey];
    const subPerms = sub.actions.map((a) => permKeyOf(modKey, subKey, a.key));
    const allSelected = subPerms.every((p) => perms.has(p));
    setPerms((prev) => {
      const next = new Set(prev);
      subPerms.forEach((p) => {
        if (allSelected) next.delete(p);
        else next.add(p);
      });
      return next;
    });
  };

  const toggleModuleAll = (modKey) => {
    if (viewOnly) return;
    const mod = catalog[modKey];
    const modPerms = Object.entries(mod.subModules).flatMap(([sk, sv]) =>
      sv.actions.map((a) => permKeyOf(modKey, sk, a.key))
    );
    const allSelected = modPerms.every((p) => perms.has(p));
    setPerms((prev) => {
      const next = new Set(prev);
      modPerms.forEach((p) => {
        if (allSelected) next.delete(p);
        else next.add(p);
      });
      return next;
    });
  };

  return (
    <>
      {Object.entries(catalog).map(([modKey, mod]) => {
        const totalModPerms = getPermissionCountForModule(modKey) || Object.values(mod.subModules).reduce((s, ss) => s + ss.actions.length, 0);
        let selectedInMod = 0;
        Object.values(mod.subModules).forEach((sv) => {
          sv.actions.forEach((a) => {
            if (perms.has(permKeyOf(modKey, Object.keys(mod.subModules).find((k) => mod.subModules[k] === sv), a.key))) selectedInMod++;
          });
        });
        const modAllSelected = selectedInMod === totalModPerms;
        const modSomeSelected = selectedInMod > 0 && !modAllSelected;
        const isModOpen = openModules[modKey];

        return (
          <div key={modKey} className="roles-perm-module">
            <div className="roles-perm-module-header" onClick={() => toggleModule(modKey)}>
              <div className="roles-perm-module-left">
                <ChevronRight
                  size={16}
                  className={`roles-perm-module-chevron ${isModOpen ? "roles-perm-module-chevron--open" : ""}`}
                />
                <span className="roles-perm-module-name">{mod.label}</span>
                <span className="roles-perm-module-count">
                  ({selectedInMod}/{totalModPerms})
                </span>
              </div>
              {!viewOnly && (
                <div className="roles-perm-module-toggle" onClick={(e) => e.stopPropagation()}>
                  <label>
                    <input
                      type="checkbox"
                      checked={modAllSelected}
                      ref={(el) => { if (el) el.indeterminate = modSomeSelected; }}
                      onChange={() => toggleModuleAll(modKey)}
                    />
                    {" "}Module All
                  </label>
                </div>
              )}
            </div>

            {isModOpen && (
              <div className="roles-perm-module-body roles-perm-module-body--nested">
                {Object.entries(mod.subModules).map(([subKey, sub]) => {
                  const subPerms = sub.actions.map((a) => permKeyOf(modKey, subKey, a.key));
                  const selCount = subPerms.filter((p) => perms.has(p)).length;
                  const subAll = selCount === subPerms.length;
                  const subSome = selCount > 0 && !subAll;
                  const isSubOpen = openSubs[modKey]?.[subKey] !== false;

                  return (
                    <div key={subKey} className="roles-perm-sub">
                      <div
                        className="roles-perm-sub-header"
                        onClick={() => toggleSub(modKey, subKey)}
                      >
                        <div className="roles-perm-module-left">
                          <ChevronRight
                            size={14}
                            className={`roles-perm-module-chevron ${isSubOpen ? "roles-perm-module-chevron--open" : ""}`}
                          />
                          <span className="roles-perm-sub-name">{sub.label}</span>
                          <span className="roles-perm-module-count">
                            ({selCount}/{subPerms.length})
                          </span>
                        </div>
                        {!viewOnly && (
                          <div className="roles-perm-module-toggle" onClick={(e) => e.stopPropagation()}>
                            <label>
                              <input
                                type="checkbox"
                                checked={subAll}
                                ref={(el) => { if (el) el.indeterminate = subSome; }}
                                onChange={() => toggleSubAll(modKey, subKey)}
                              />
                              {" "}All
                            </label>
                          </div>
                        )}
                      </div>

                      {isSubOpen && (
                        <div className="roles-perm-sub-body">
                          {sub.actions.map((a) => {
                            const pk = permKeyOf(modKey, subKey, a.key);
                            const checked = perms.has(pk);
                            return (
                              <div
                                key={pk}
                                className={`roles-perm-item ${viewOnly ? "roles-perm-item--view" : ""}`}
                              >
                                {viewOnly ? (
                                  <Lock size={12} color={checked ? "#3b82f6" : "#cbd5e1"} />
                                ) : (
                                  <input
                                    type="checkbox"
                                    id={`${modKey}-${subKey}-${a.key}`}
                                    checked={checked}
                                    onChange={() => togglePerm(pk)}
                                  />
                                )}
                                <label
                                  htmlFor={viewOnly ? undefined : `${modKey}-${subKey}-${a.key}`}
                                  style={viewOnly && !checked ? { color: "#cbd5e1" } : undefined}
                                >
                                  {a.label}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// --------------------- View Modal ---------------------

function ViewModal({ role, roleName, catalog, onClose }) {
  const perms = useMemo(() => new Set(role.permissions), [role.permissions]);
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
            <span className="roles-modal-perm-count">{role.permissions.length} permissions</span>
          </div>

          <PermEditor catalog={catalog} perms={perms} setPerms={() => {}} viewOnly />
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

// --------------------- Edit Modal ---------------------

function EditModal({ role, roleName, catalog, onSave, onClose }) {
  const [permissions, setPermissions] = useState(() => new Set(role.permissions));

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

          <PermEditor
            catalog={catalog}
            perms={permissions}
            setPerms={setPermissions}
            viewOnly={roleName === "Admin" && false}
          />
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

// --------------------- Main Page ---------------------

export default function Roles() {
  const catalog = useMemo(() => getFullPermissionCatalog(), []);

  const [roles, setRoles] = useState(() => {
    const stored = localStorage.getItem("rbac_roles");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { ...DEFAULT_ROLES };
      }
    }
    return { ...DEFAULT_ROLES };
  });

  const [viewRole, setViewRole] = useState(null);
  const [editRole, setEditRole] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDynamic, setShowDynamic] = useState(false);

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRolePerms, setNewRolePerms] = useState(() => new Set());

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const isAdmin = user?.role === "Admin";

  const persistRoles = useCallback((updated) => {
    setRoles(updated);
    localStorage.setItem("rbac_roles", JSON.stringify(updated));
  }, []);

  const handleSavePermissions = (roleName, permissions) => {
    const updated = {
      ...roles,
      [roleName]: {
        ...roles[roleName],
        permissions,
      },
    };
    persistRoles(updated);
    setEditRole(null);
  };

  const handleDeleteRole = (roleName) => {
    if (roles[roleName]?.isSystem) return;
    if (!window.confirm(`Delete role "${roles[roleName]?.displayName || roleName}"?`)) return;
    const { [roleName]: _, ...rest } = roles;
    persistRoles(rest);
  };

  const handleCreateRole = () => {
    const name = newRoleName.trim();
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
    setNewRoleName("");
    setNewRoleDesc("");
    setNewRolePerms(new Set());
    setShowCreate(false);
  };

  const handleAddDynamic = (item) => {
    const custom = loadCustomModules();
    if (item.type === "module") {
      if (catalog[item.key] || custom.some((m) => m.key === item.key)) return;
      custom.push({ key: item.key, label: item.label, subModules: [] });
      saveCustomModules(custom);
    } else if (item.type === "subModule") {
      const mod = custom.find((m) => m.key === item.moduleKey);
      if (catalog[item.moduleKey] && !mod) {
        // adding to a built-in module: store as override
        custom.push({
          key: `${item.moduleKey}__extension`,
          label: catalog[item.moduleKey].label,
          baseModule: item.moduleKey,
          subModules: [{ key: item.key, label: item.label, actions: [] }],
          isExtension: true,
        });
        saveCustomModules(custom);
        setShowDynamic(false);
        window.location.reload();
        return;
      }
      if (!mod) {
        custom.push({
          key: item.moduleKey,
          label: item.label,
          subModules: [{ key: item.key, label: item.label, actions: [] }],
        });
        saveCustomModules(custom);
        setShowDynamic(false);
        window.location.reload();
        return;
      }
      if (!mod.subModules.some((s) => s.key === item.key)) {
        mod.subModules.push({ key: item.key, label: item.label, actions: [] });
      }
      saveCustomModules(custom);
    } else if (item.type === "action") {
      const mod = custom.find((m) => m.key === item.moduleKey);
      if (mod) {
        const sub = mod.subModules.find((s) => s.key === item.subModuleKey);
        if (sub && !sub.actions.some((a) => a.key === item.key)) {
          sub.actions.push({ key: item.key, label: item.label });
        }
        saveCustomModules(custom);
      } else {
        // adding action to a built-in module => extension approach
        const ext = custom.find((m) => m.baseModule === item.moduleKey);
        if (ext) {
          const sub = ext.subModules.find((s) => s.key === item.subModuleKey);
          if (sub && !sub.actions.some((a) => a.key === item.key)) {
            sub.actions.push({ key: item.key, label: item.label });
          }
        } else {
          custom.push({
            key: `${item.moduleKey}__extension`,
            label: catalog[item.moduleKey]?.label || item.moduleKey,
            baseModule: item.moduleKey,
            subModules: [{ key: item.subModuleKey, label: item.subModuleKey, actions: [{ key: item.key, label: item.label }] }],
            isExtension: true,
          });
        }
        saveCustomModules(custom);
      }
    }
    setShowDynamic(false);
    window.location.reload();
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

  return (
    <MainLayout>
      <div className="roles-page">
        <div className="roles-page-header">
          <div>
            <h1>Roles & Permissions</h1>
            <p>Manage role-based access control for your organization</p>
          </div>
          <div className="roles-page-actions">
            <button
              type="button"
              className="roles-page-add-module-btn"
              onClick={() => setShowDynamic(true)}
            >
              <Plus size={16} />
              Add Module / View
            </button>
            <button
              type="button"
              className="roles-page-add-btn"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={16} />
              Create Role
            </button>
          </div>
        </div>

        <div className="roles-card-grid">
          {Object.entries(roles).map(([roleName, role]) => {
            const permCount = role.permissions.length;
            const previewPerms = role.permissions.slice(0, 4);
            const remaining = permCount - previewPerms.length;

            return (
              <div key={roleName} className="roles-card-item">
                <div className="roles-card-top">
                  <div className="roles-card-info">
                    <div className={`roles-card-icon roles-card-icon--${getIconColor(roleName)}`}>
                      <ShieldCheck size={18} />
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
                  <button
                    type="button"
                    className="roles-card-view-btn"
                    onClick={() => setViewRole({ roleName, role })}
                  >
                    <Eye size={14} />
                    View
                  </button>
                  <button
                    type="button"
                    className="roles-card-edit-btn"
                    onClick={() => setEditRole({ roleName, role })}
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  {!role.isSystem && (
                    <button
                      type="button"
                      className="roles-card-delete-btn"
                      onClick={() => handleDeleteRole(roleName)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {viewRole && (
          <ViewModal
            role={viewRole.role}
            roleName={viewRole.roleName}
            catalog={catalog}
            onClose={() => setViewRole(null)}
          />
        )}

        {editRole && (
          <EditModal
            role={editRole.role}
            roleName={editRole.roleName}
            catalog={catalog}
            onSave={handleSavePermissions}
            onClose={() => setEditRole(null)}
          />
        )}

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
                        placeholder="e.g. Payroll Officer"
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

                <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", marginBottom: "10px" }}>
                  Assign Permissions
                </div>

                <PermEditor
                  catalog={catalog}
                  perms={newRolePerms}
                  setPerms={setNewRolePerms}
                  viewOnly={false}
                />
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

        {showDynamic && (
          <AddDynamicModal
            catalog={catalog}
            onAdd={handleAddDynamic}
            onClose={() => setShowDynamic(false)}
          />
        )}
      </div>
    </MainLayout>
  );
}
