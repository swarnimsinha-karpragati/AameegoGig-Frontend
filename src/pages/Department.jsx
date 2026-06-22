import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getOtPolicies,
  getShifts,
  getEmployees,
} from "../services/departmentService";

import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X
} from "lucide-react";

import "./Department.css";

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
  };

  const [form, setForm] = useState(initialForm);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  
  const [shifts, setShifts] = useState([]);
  const [otPolicies, setOtPolicies] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAllData = async () => {
    if (!vendorId) return;
    try {
      setLoading(true);
      const [depRes, shiftRes, otRes, empRes] = await Promise.all([
        getDepartments(vendorId),
        getShifts(vendorId),
        getOtPolicies(vendorId),
        getEmployees(vendorId)
      ]);
      
      setDepartments(depRes.data || []);
      setShifts(shiftRes.data || []);
      setOtPolicies(otRes.data || []);
      setEmployees(empRes.data || []);
    } catch (error) {
      console.error("Error standardizing department view initialization:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setIsEditing(false);
    setIsViewing(false);
    setSelectedDepartment(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Department name is required");
      return;
    }

    const payload = {
      vendorId: vendorId,
      name: form.name,
      description: form.description,
      shift: form.shift || null,
      otPolicy: form.otPolicy || null,
      departmentHead: form.departmentHead || null,
    };

    try {
      if (isEditing && selectedDepartment) {
        await updateDepartment(selectedDepartment._id, payload);
        alert("Department updated successfully");
      } else {
        await createDepartment(payload);
        alert("Department created successfully");
      }
      handleModalClose();
      const depRes = await getDepartments(vendorId);
      setDepartments(depRes.data || []);
    } catch (error) {
      alert(error.response?.data?.error || "Execution processing operation failed");
    }
  };

  const handleView = (dep) => {
    setSelectedDepartment(dep);
    setForm({
      name: dep.name || "",
      description: dep.description || "",
      shift: dep.shift?._id || "",
      otPolicy: dep.otPolicy?._id || "",
      departmentHead: dep.departmentHead?._id || "",
    });
    setIsViewing(true);
  };

  const handleEdit = (dep) => {
    setSelectedDepartment(dep);
    setForm({
      name: dep.name || "",
      description: dep.description || "",
      shift: dep.shift?._id || "",
      otPolicy: dep.otPolicy?._id || "",
      departmentHead: dep.departmentHead?._id || "",
    });
    setIsEditing(true);
    setShowAddModal(true);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Are you sure you want to completely drop this department?")) return;
    try {
      await deleteDepartment(id);
      alert("Department dropped cleanly");
      const depRes = await getDepartments(vendorId);
      setDepartments(depRes.data || []);
    } catch (error) {
      alert(error.response?.data?.error || "Drop failure transaction tracking issue");
    }
  };

  const filteredDepartments = departments.filter((dep) =>
    [dep.name, dep.description, dep.departmentHead?.name]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const renderFormFields = (isDisabled = false) => (
    <form id="department-core-form" onSubmit={handleSubmit}>
      <FormSection title="Primary Details" description="Identify core naming scope values">
        <FormField label="Department Name" htmlFor="dep-name" required fullWidth>
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

      <FormSection title="Operational Rules & Leadership" description="Link shifts, rules, and heads">
        <FormField label="Assigned Operational Shift" htmlFor="dep-shift">
          <select id="dep-shift" name="shift" value={form.shift} onChange={handleChange} disabled={isDisabled}>
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
          <select id="dep-head" name="departmentHead" value={form.departmentHead} onChange={handleChange} disabled={isDisabled}>
            <option value="">Assign Later</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>{emp.name} — ({emp.email})</option>
            ))}
          </select>
        </FormField>
      </FormSection>
    </form>
  );

  return (
    <MainLayout>
      <div className="manage-depts-container">
        <p className="manage-depts-stats">
          Total Departments Monitored: <strong>{departments.length}</strong>
        </p>

        <div className="manage-depts-toolbar">
          <div className="manage-depts-search">
            <Search size={22} />
            <input
              type="text"
              placeholder="Search by department name, lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="manage-depts-actions">
            <button className="manage-depts-add-trigger" onClick={() => { setIsEditing(false); setShowAddModal(true); }}>
              <Plus size={22} />
              Add Department
            </button>
          </div>
        </div>

        <div className="manage-depts-card">
          <div className="manage-depts-scrollable">
            <table className="manage-depts-table">
              <thead>
                <tr>
                  <th>Department Name</th>
                  <th>Description</th>
                  <th>Default Shift</th>
                  <th>Overtime Rule</th>
                  <th>Leadership Head</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.length > 0 ? (
                  filteredDepartments.map((dep) => (
                    <tr key={dep._id}>
                      <td style={{ fontWeight: "600" }}>{dep.name}</td>
                      <td>{dep.description || <em style={{ opacity: 0.5 }}>No description</em>}</td>
                      <td>{dep.shift?.name || dep.shift?.shiftName || "-"}</td>
                      <td>{dep.otPolicy?.policyName || dep.otPolicy?.name || "-"}</td>
                      <td>{dep.departmentHead ? dep.departmentHead.name : <span style={{ opacity: 0.5 }}>Unassigned</span>}</td>
                      <td>
                        <div className="manage-depts-row-buttons">
                          <button className="manage-depts-btn-view" onClick={() => handleView(dep)}>
                            <Eye size={15} />
                          </button>
                          <button className="manage-depts-btn-edit" onClick={() => handleEdit(dep)}>
                            <Pencil size={15} />
                          </button>
                          <button className="manage-depts-btn-delete" onClick={() => handleDeleteClick(dep._id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="manage-depts-empty">
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
            title={isEditing ? "Modify Department Record" : "Register New Department Branch"}
            onClose={handleModalClose}
            size="lg"
            footer={
              <>
                <button type="button" className="manage-depts-control-btn manage-depts-control-btn--secondary" onClick={handleModalClose}>
                  Cancel
                </button>
                <button type="submit" form="department-core-form" className="manage-depts-control-btn manage-depts-control-btn--primary">
                  {isEditing ? "Apply Changes" : "Create Group"}
                </button>
              </>
            }
          >
            {renderFormFields(false)}
          </DepModal>
        ) : null}

        {isViewing ? (
          <DepModal title="Department Analysis Review" onClose={handleModalClose} size="lg">
            {renderFormFields(true)}
          </DepModal>
        ) : null}
      </div>
    </MainLayout>
  );
}

export default Departments;