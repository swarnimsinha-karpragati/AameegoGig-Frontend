import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import {
  useDepartments,
  useShifts,
  useOtPolicies,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from "../hooks/useDepartments";
import SearchableEmployeeSelectServer from "../components/attendance/SearchableEmployeeSelectServer";

import {
  Search,
  Eye,
  Pencil,
  Trash2,
  X,
  Plus,
  Copy
} from "lucide-react";

import "./Department.css";
import Button from "../components/Button";
import { isSiteVendor } from "../utils/vendorIdhelper";
import { getStoredUser, roleHasPermission } from "../utils/roles";

const isSite = isSiteVendor();
const name = isSite ? "Site" : "Department";

function DepModal({ title, onClose, size = "md", children, footer }) {
  return (
    <div
      className="manage-depts-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className={`manage-depts-modal manage-depts-modal--${size}`} role="dialog" aria-modal="true">
        <div className="manage-depts-modal__header">
          <h3>{title}</h3>
          <button type="button" className="manage-depts-modal__close" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>
        <div className="manage-depts-modal__body">{children}</div>
        {footer ? <div className="manage-depts-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}

function FormSection({ title, description, children }) {
  return (
    <section className="manage-depts-section">
      <div className="manage-depts-section__head">
        <h4>{title}</h4>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="manage-depts-grid">{children}</div>
    </section>
  );
}

function FormField({ label, htmlFor, required, fullWidth, children }) {
  return (
    <div className={`manage-depts-field${fullWidth ? " manage-depts-field--full" : ""}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required ? <span className="manage-depts-required">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function Departments() {
  const [vendorId, setVendorId] = useState(null);
  const userRole = getStoredUser()?.role;
  const canView =
    userRole === "Admin" ||
    roleHasPermission(userRole, "departments:view") ||
    roleHasPermission(userRole, "departments:manage");
  const canManage = roleHasPermission(userRole, "departments:manage");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const { vendorId } = JSON.parse(userData);
      setVendorId(vendorId);
    }
  }, []);

  const initialForm = {
    name: "",
    description: "",
    shift: "",
    otPolicy: "",
    departmentHead: "",
    sitePayoutRule: "",
    stateName: "",
    latitude: "",
    longitude: "",
    geofenceRadiusMeters: "",
    allowOutsideGeofence: true,
  };

  const [form, setForm] = useState(initialForm);
  const [geoErrors, setGeoErrors] = useState({});
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: departments = [], isLoading: loading } = useDepartments(vendorId);
  const { data: shifts = [] } = useShifts(vendorId);
  const { data: otPolicies = [] } = useOtPolicies(vendorId);

  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  // Numeric sanitizers: only valid coordinate characters reach the state.
  const sanitizeGeoValue = (name, value) => {
    const str = String(value ?? "");
    if (name === "geofenceRadiusMeters") {
      let v = str.replace(/[^0-9.]/g, "");
      const dot = v.indexOf(".");
      if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "");
      return v;
    }
    // latitude / longitude: digits, one dot, one leading minus
    let v = str.replace(/[^0-9.-]/g, "");
    const negative = v.startsWith("-");
    v = v.replace(/-/g, "");
    const dot = v.indexOf(".");
    if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "");
    return (negative ? "-" : "") + v;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === "checkbox" ? checked : value;
    if (["latitude", "longitude", "geofenceRadiusMeters"].includes(name)) {
      finalValue = sanitizeGeoValue(name, value);
    }
    setForm((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
    setGeoErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleHeadChange = (employeeId) => {
    setForm((prev) => ({
      ...prev,
      departmentHead: employeeId,
    }));
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setIsEditing(false);
    setIsViewing(false);
    setSelectedDepartment(null);
    setForm(initialForm);
    setGeoErrors({});
  };

  // Geofence is all-or-nothing: latitude + longitude + radius come together.
  const validateGeofence = (values) => {
    const errs = {};
    const isSet = (v) => v !== "" && v !== null && v !== undefined;
    const anySet = isSet(values.latitude) || isSet(values.longitude) || isSet(values.geofenceRadiusMeters);
    if (!anySet) return errs;

    const lat = Number(values.latitude);
    const long = Number(values.longitude);
    const rad = Number(values.geofenceRadiusMeters);

    if (!isSet(values.latitude) || !Number.isFinite(lat)) {
      errs.latitude = "Latitude is required when geofence is set";
    } else if (lat < -90 || lat > 90) {
      errs.latitude = "Latitude must be between -90 and 90";
    }
    if (!isSet(values.longitude) || !Number.isFinite(long)) {
      errs.longitude = "Longitude is required when geofence is set";
    } else if (long < -180 || long > 180) {
      errs.longitude = "Longitude must be between -180 and 180";
    }
    if (!isSet(values.geofenceRadiusMeters) || !Number.isFinite(rad)) {
      errs.geofenceRadiusMeters = "Radius is required when geofence is set";
    } else if (rad <= 0) {
      errs.geofenceRadiusMeters = "Radius must be greater than 0 meters";
    } else if (rad > 100000) {
      errs.geofenceRadiusMeters = "Radius cannot exceed 100000 meters";
    }
    return errs;
  };

  const toNullableNumber = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert(name + " is required");
      return;
    }

    const geoErrors = validateGeofence(form);
    if (Object.keys(geoErrors).length) {
      setGeoErrors(geoErrors);
      alert("Fix the geofence fields before saving");
      return;
    }
    setGeoErrors({});

    const payload = {
      vendorId: vendorId,
      name: form.name,
      description: form.description,
      shift: form.shift || null,
      otPolicy: form.otPolicy || null,
      departmentHead: form.departmentHead || null,
      sitePayoutRule: form.sitePayoutRule || null,
      stateName: form.stateName || null,
      latitude: toNullableNumber(form.latitude),
      longitude: toNullableNumber(form.longitude),
      geofenceRadiusMeters: toNullableNumber(form.geofenceRadiusMeters),
      allowOutsideGeofence: form.allowOutsideGeofence !== false,
    };

    try {
      if (isEditing && selectedDepartment) {
        await updateMutation.mutateAsync({ vendorId: selectedDepartment._id, data: payload });
        alert(name + " updated successfully");
      } else {
        await createMutation.mutateAsync(payload);
        alert(name + " created successfully");
      }
      handleModalClose();
    } catch (error) {
      alert(error.response?.data?.error || "Execution processing operation failed");
    }
  };

  const departmentToForm = (dep) => ({
    name: dep.name || "",
    description: dep.description || "",
    shift: dep.shift?._id || "",
    otPolicy: dep.otPolicy?._id || "",
    departmentHead: dep.departmentHead?._id || "",
    stateName: dep.stateName || "",
    sitePayoutRule: dep.sitePayoutRule || "",
    latitude: dep.latitude ?? "",
    longitude: dep.longitude ?? "",
    geofenceRadiusMeters: dep.geofenceRadiusMeters ?? "",
    // Old records without the flag default to allowed (checked).
    allowOutsideGeofence: dep.allowOutsideGeofence !== false,
  });

  const handleView = (dep) => {
    setSelectedDepartment(dep);
    setForm(departmentToForm(dep));
    setGeoErrors({});
    setIsViewing(true);
  };

  const handleEdit = (dep) => {
    setSelectedDepartment(dep);
    setForm(departmentToForm(dep));
    setGeoErrors({});
    setIsEditing(true);
    setShowAddModal(true);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Are you sure you want to completely drop this department?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      alert("Department dropped cleanly");
    } catch (error) {
      alert(error.response?.data?.error || "Drop failure transaction tracking issue");
    }
  };

  const handleCopyDepartmentId = async (id) => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      alert(name + " Id copied to clipboard");
    } catch (error) {
      console.error("Failed to copy " + name + " Id", error);
      alert("Unable to copy " + name + " Id");
    }
  };

  const filteredDepartments = departments.filter((dep) =>
    [dep.name, dep.description, dep.departmentHead?.name, dep.stateName, dep.sitePayoutRule, dep?.departmentUniqueId, dep.siteStateName]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const renderFormFields = (isDisabled = false) => (
    <form id="department-core-form" onSubmit={handleSubmit}>
      <FormSection title="Primary Details" description="Identify core naming scope values">
        <FormField label={`${name} Name`} htmlFor="dep-name" required fullWidth>
          <input
            id="dep-name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            disabled={isDisabled}
            placeholder="e.g. Engineering Operations"
            required
          />
        </FormField>
        <FormField label="Description" htmlFor="dep-desc" fullWidth>
          <textarea
            id="dep-desc"
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            disabled={isDisabled}
            placeholder="Describe the operations scope..."
          />
        </FormField>
      </FormSection>

      <div className="site-extra-fields">
        <div className="site-payout-rule">
          <FormField
            label={`${name} Payout Rule`}
            htmlFor="site-payout-rule"
          >
            <select
              id="site-payout-rule"
              name="sitePayoutRule"
              value={form.sitePayoutRule || ""}
              onChange={handleChange}
              disabled={isDisabled}
            >
              <option value="">Select Payout Rule</option>
              <option value="Daily">Daily</option>
              <option value="Monthly">Monthly</option>
            </select>
          </FormField>
        </div>

        <div className="site-state-name">
          <FormField
            label={`${name} State Name`}
            htmlFor="site-state-name"
          >
            <select
              id="site-state-name"
              name="stateName"
              value={form.stateName || ""}
              onChange={handleChange}
              disabled={isDisabled}
            >
              <option value="">Select State</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
              <option value="Delhi">Delhi</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Haryana">Haryana</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Punjab">Punjab</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Telangana">Telangana</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="West Bengal">West Bengal</option>
            </select>
          </FormField>
        </div>
      </div>

      <FormSection title="Attendance Geofence" description="Site location and allowed radius in meters for attendance marking. Leave all three empty for no geofence.">
        <FormField label="Latitude" htmlFor="dep-latitude">
          <input
            id="dep-latitude"
            name="latitude"
            type="text"
            inputMode="decimal"
            value={form.latitude}
            onChange={handleChange}
            disabled={isDisabled}
            placeholder="e.g. 28.6139"
          />
          {geoErrors.latitude ? (
            <p style={{ color: "#b91c1c", fontSize: 12, margin: "4px 0 0" }}>{geoErrors.latitude}</p>
          ) : null}
        </FormField>
        <FormField label="Longitude" htmlFor="dep-longitude">
          <input
            id="dep-longitude"
            name="longitude"
            type="text"
            inputMode="decimal"
            value={form.longitude}
            onChange={handleChange}
            disabled={isDisabled}
            placeholder="e.g. 77.2090"
          />
          {geoErrors.longitude ? (
            <p style={{ color: "#b91c1c", fontSize: 12, margin: "4px 0 0" }}>{geoErrors.longitude}</p>
          ) : null}
        </FormField>
        <FormField label="Geofence Radius (meters)" htmlFor="dep-radius">
          <input
            id="dep-radius"
            name="geofenceRadiusMeters"
            type="text"
            inputMode="decimal"
            value={form.geofenceRadiusMeters}
            onChange={handleChange}
            disabled={isDisabled}
            placeholder="e.g. 200"
          />
          {geoErrors.geofenceRadiusMeters ? (
            <p style={{ color: "#b91c1c", fontSize: 12, margin: "4px 0 0" }}>{geoErrors.geofenceRadiusMeters}</p>
          ) : null}
        </FormField>
        <FormField label="Outside Geofence" htmlFor="dep-allow-outside" fullWidth>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: isDisabled ? "default" : "pointer", fontWeight: 500 }}>
            <input
              id="dep-allow-outside"
              name="allowOutsideGeofence"
              type="checkbox"
              checked={form.allowOutsideGeofence !== false}
              onChange={handleChange}
              disabled={isDisabled}
              style={{ width: 16, height: 16, accentColor: "#2563eb" }}
            />
            Can mark attendance outside the geofence
          </label>
        </FormField>
      </FormSection>

      <FormSection title="Operational Rules & Leadership" description="Link shifts, rules, and heads">
        <FormField required label="Assigned Operational Shift" htmlFor="dep-shift">
          <select id="dep-shift" name="shift" value={form.shift} onChange={handleChange} required disabled={isDisabled}>
            <option value="">No Active Shift Default</option>
            {shifts.map((s) => (
              <option key={s._id} value={s._id}>{s.name || s.shiftName}</option>
            ))}
          </select>
        </FormField>

        <FormField label="OverTime Policy Rule" htmlFor="dep-ot">
          <select id="dep-ot" name="otPolicy" value={form.otPolicy} onChange={handleChange} disabled={isDisabled}>
            <option value="">No Custom Rule Assigned</option>
            {otPolicies.map((p) => (
              <option key={p._id} value={p._id}>{p.policyName || p.name}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Department Head / Manager" htmlFor="dep-head" fullWidth>
          <SearchableEmployeeSelectServer
            value={form.departmentHead}
            onChange={handleHeadChange}
            disabled={isDisabled}
            placeholder="Search & select department manager..."
          />
        </FormField>
      </FormSection>
    </form>
  );

  return (
    <MainLayout>
      <div className="manage-depts-container">
        <p className="manage-depts-stats">
          Total {isSiteVendor() ? "Sites" : "Departments"} Monitored: <strong>{departments.length}</strong>
        </p>

        <div className="manage-depts-toolbar">
          <div className="manage-depts-search">
            <Search size={22} />
            <input
              type="text"
              placeholder={"Search by " + name + " name, lead..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="manage-depts-actions">
            {canManage && (
            <Button icon={<Plus size={20} />} onClick={() => { setIsEditing(false); setShowAddModal(true); }}>
              Add {name}
            </Button>
            )}
          </div>
        </div>

        <div className="manage-depts-card">
          <div className="manage-depts-scrollable">
            <table className="manage-depts-table">
              <thead>
                <tr>
                  <th>{name} Name</th>
                  <th>Description</th>
                  <th>Default Shift</th>
                  <th>Overtime Rule</th>
                  <th>{name} Payout Rule</th>
                  <th>{name} State Name</th>
                  <th>Leadership Head</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.length > 0 ? (
                  filteredDepartments.map((dep) => (
                    <tr key={dep._id}>
                      <td style={{ fontWeight: "600" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>{dep.name}</span>
                          <button
                            type="button"
                            className="manage-depts-copy-btn"
                            onClick={() => handleCopyDepartmentId(dep?.departmentUniqueId || dep?._id)}
                            title={`Copy ${name} ID`}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </td>
                      <td>{dep.description || <em style={{ opacity: 0.5 }}>No description</em>}</td>
                      <td>{dep.shift?.name || dep.shift?.shiftName || "-"}</td>
                      <td>{dep.otPolicy?.policyName || dep.otPolicy?.name || "-"}</td>
                      <td>{dep.sitePayoutRule || <em style={{ opacity: 0.5 }}>-</em>}</td>
                      <td>{dep.stateName || <em style={{ opacity: 0.5 }}>-</em>}</td>
                      <td>{dep.departmentHead ? dep.departmentHead.name : <span style={{ opacity: 0.5 }}>Unassigned</span>}</td>
                      <td>
                        <div className="manage-depts-row-buttons">
                          {(canView || canManage) && (
                            <button className="manage-depts-btn-view" onClick={() => handleView(dep)}>
                              <Eye size={15} />
                            </button>
                          )}
                          {canManage && (
                            <button className="manage-depts-btn-edit" onClick={() => handleEdit(dep)}>
                              <Pencil size={15} />
                            </button>
                          )}
                          {canManage && (
                            <button className="manage-depts-btn-delete" onClick={() => handleDeleteClick(dep._id)}>
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="manage-depts-empty">
                      {loading ? "Loading administrative departments..." : "No matching organization branches discovered."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showAddModal ? (
          <DepModal
            title={isEditing ? "Modify " + name + " Record" : "Register New " + name}
            onClose={handleModalClose}
            size="lg"
            footer={
              <>
                <Button type="button" onClick={handleModalClose} className="secondary-btn">
                  Cancel
                </Button>
                <Button type="submit" form="department-core-form">
                  {isEditing ? "Apply Changes" : "Create Group"}
                </Button>
              </>
            }
          >
            {renderFormFields(false)}
          </DepModal>
        ) : null}

        {isViewing ? (
          <DepModal title={name + " Analysis Review"} onClose={handleModalClose} size="lg">
            {renderFormFields(true)}
          </DepModal>
        ) : null}
      </div>
    </MainLayout>
  );
}

export default Departments;