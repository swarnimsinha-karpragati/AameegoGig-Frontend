import React, { useEffect, useRef, useState } from "react";
import "./WeekOffManager.css";
import { getDepartments } from "../services/departmentService";
import {
  createWeekOff,
  deleteWeekOff,
  getWeekOffs,
  updateWeekOff,
} from "../services/settingService";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const WeekOffManager = ({ vendorId }) => {
  const formRef = useRef(null);

  const initialFormState = {
    department: "",
    weekOffDays: ["Sunday"],
  };

  const [configs, setConfigs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const fetchDepartments = async () => {
    if (!vendorId) return;
    try {
      const res = await getDepartments(vendorId);
      const list = res?.data?.departments || res?.data?.data || res?.data || [];
      setDepartments(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Failed to load departments:", error);
    }
  };

  const fetchWeekOffs = async () => {
    if (!vendorId) return;
    try {
      setLoading(true);
      const res = await getWeekOffs(vendorId);
      const list = res?.data?.data || [];
      setConfigs(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Failed to load week-offs:", error);
      setStatusMessage({
        type: "error",
        text: error?.response?.data?.message || "Unable to load week-off configurations.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchWeekOffs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  useEffect(() => {
    if (!statusMessage.text) return undefined;
    const timer = setTimeout(() => setStatusMessage({ type: "", text: "" }), 5000);
    return () => clearTimeout(timer);
  }, [statusMessage.text]);

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingConfigId(null);
  };

  const toggleDay = (day) => {
    setFormData((prev) => ({
      ...prev,
      weekOffDays: prev.weekOffDays.includes(day)
        ? prev.weekOffDays.filter((item) => item !== day)
        : [...prev.weekOffDays, day],
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditClick = (config) => {
    setEditingConfigId(config._id);
    setFormData({
      department: config.department || "",
      weekOffDays: Array.isArray(config.weekOffDays) ? config.weekOffDays : ["Sunday"],
    });

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleDeleteClick = async (config) => {
    const label = config.department || "All Departments";
    if (!window.confirm(`Delete week-off configuration for "${label}"?`)) return;
    if (isActionLoading) return;

    try {
      setIsActionLoading(true);
      await deleteWeekOff(config._id);
      setConfigs((prev) => prev.filter((item) => item._id !== config._id));
      if (editingConfigId === config._id) {
        resetForm();
      }
      setStatusMessage({ type: "success", text: "Week-off configuration deleted." });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error?.response?.data?.message || "Failed to delete week-off configuration.",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) {
      alert("Vendor configuration not found.");
      return;
    }
    if (!formData.weekOffDays.length) {
      setStatusMessage({ type: "error", text: "Select at least one week-off day." });
      return;
    }
    if (isActionLoading) return;

    const payload = {
      vendorId,
      department: formData.department || null,
      weekOffDays: formData.weekOffDays,
    };

    try {
      setIsActionLoading(true);
      setStatusMessage({ type: "", text: "" });

      if (editingConfigId) {
        const res = await updateWeekOff(editingConfigId, payload);
        const updated = res?.data?.data;
        if (updated) {
          setConfigs((prev) =>
            prev.map((item) => (item._id === editingConfigId ? updated : item))
          );
        } else {
          await fetchWeekOffs();
        }
        setStatusMessage({ type: "success", text: "Week-off configuration updated." });
        resetForm();
      } else {
        const res = await createWeekOff(payload);
        const created = res?.data?.data;
        if (created) {
          setConfigs((prev) => [...prev, created]);
        } else {
          await fetchWeekOffs();
        }
        setStatusMessage({ type: "success", text: "Week-off configuration created." });
        setFormData(initialFormState);
      }
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error?.response?.data?.message || "Failed to save week-off configuration.",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const sortedConfigs = [...configs].sort((a, b) => {
    if (!a.department && b.department) return -1;
    if (a.department && !b.department) return 1;
    return String(a.department || "").localeCompare(String(b.department || ""));
  });

  return (
    <div className="weekoff-manager-container">
      <section className="weekoff-list-section">
        <div className="weekoff-list-header">
          <div>
            <h2>Week-Off Policy</h2>
            <p>
              Configure weekly off days by department. Department rules override the
              organization default.
            </p>
          </div>
        </div>

        {statusMessage.text ? (
          <div className={`weekoff-status weekoff-status--${statusMessage.type}`}>
            {statusMessage.text}
          </div>
        ) : null}

        {loading ? (
          <p className="weekoff-empty">Loading week-off configurations...</p>
        ) : sortedConfigs.length === 0 ? (
          <p className="weekoff-empty">
            No week-off policies yet. Create an organization default (e.g. Sunday off),
            then add department-specific rules if needed.
          </p>
        ) : (
          <div className="weekoff-table-wrap">
            <table className="weekoff-table">
              <thead>
                <tr>
                  <th>Scope</th>
                  <th>Weekly Off Days</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedConfigs.map((config) => (
                  <tr key={config._id}>
                    <td>
                      <strong>{config.department || "All Departments (Default)"}</strong>
                      <small>
                        {config.department
                          ? "Department-specific policy"
                          : "Fallback for departments without their own policy"}
                      </small>
                    </td>
                    <td>
                      <div className="weekoff-day-badges">
                        {config.weekOffDays?.map((day) => (
                          <span key={day} className="weekoff-day-badge">
                            {day}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="weekoff-actions">
                      <button
                        type="button"
                        className="weekoff-btn weekoff-btn--ghost"
                        onClick={() => handleEditClick(config)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="weekoff-btn weekoff-btn--danger"
                        onClick={() => handleDeleteClick(config)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section ref={formRef} className="weekoff-form-section">
        <h2>{editingConfigId ? "Edit Week-Off Policy" : "Add Week-Off Policy"}</h2>
        <form className="weekoff-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="weekoff-department">Department</label>
            <select
              id="weekoff-department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              disabled={Boolean(editingConfigId)}
            >
              <option value="">All Departments (Default)</option>
              {departments.map((dept) => (
                <option key={dept._id || dept.name} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
            <span className="weekoff-field-hint">
              Leave blank for org-wide default. IT can have Saturday–Sunday off while
              others keep only Sunday.
            </span>
          </div>

          <div className="form-group">
            <label>Weekly Off Days</label>
            <div className="weekoff-days-grid">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = formData.weekOffDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    className={`weekoff-day-btn ${isSelected ? "active" : ""}`}
                    onClick={() => toggleDay(day)}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="weekoff-form-actions">
            {editingConfigId ? (
              <button
                type="button"
                className="weekoff-btn weekoff-btn--ghost"
                onClick={resetForm}
                disabled={isActionLoading}
              >
                Cancel
              </button>
            ) : null}
            <button
              type="submit"
              className="weekoff-btn weekoff-btn--primary"
              disabled={isActionLoading}
            >
              {isActionLoading
                ? "Saving..."
                : editingConfigId
                  ? "Update Policy"
                  : "Add Policy"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default WeekOffManager;
