import React, { useEffect, useRef, useState } from "react";
import "./HolidayManager.css";
import { getDepartments } from "../services/departmentService";
import {
  createHoliday,
  deleteHoliday,
  getHolidays,
  updateHoliday,
} from "../services/holidayService";

const HOLIDAY_TYPES = ["National", "Festival", "Restricted", "Company"];

const formatDisplayDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toInputDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const HolidayManager = ({ vendorId }) => {
  const formRef = useRef(null);
  const currentYear = new Date().getFullYear();

  const initialFormState = {
    name: "",
    date: "",
    department: "",
    type: "National",
    description: "",
  };

  const [holidays, setHolidays] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterYear, setFilterYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState(null);
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

  const fetchHolidays = async () => {
    if (!vendorId) return;
    try {
      setLoading(true);
      const res = await getHolidays({ vendorId, year: filterYear });
      const list = res?.data?.data || [];
      setHolidays(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Failed to load holidays:", error);
      setStatusMessage({
        type: "error",
        text: error?.response?.data?.message || "Unable to load holidays.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  useEffect(() => {
    fetchHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, filterYear]);

  useEffect(() => {
    if (!statusMessage.text) return undefined;
    const timer = setTimeout(() => setStatusMessage({ type: "", text: "" }), 5000);
    return () => clearTimeout(timer);
  }, [statusMessage.text]);

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingHolidayId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditClick = (holiday) => {
    if (holiday.source === "weekOff") {
      setStatusMessage({
        type: "error",
        text: "Legacy holidays from WeekOff settings cannot be edited here.",
      });
      return;
    }

    setEditingHolidayId(holiday._id);
    setFormData({
      name: holiday.name || "",
      date: toInputDate(holiday.date),
      department: holiday.department || "",
      type: holiday.type || "National",
      description: holiday.description || "",
    });

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleDeleteClick = async (holiday) => {
    if (holiday.source === "weekOff") {
      setStatusMessage({
        type: "error",
        text: "Legacy holidays from WeekOff settings cannot be deleted here.",
      });
      return;
    }

    if (!window.confirm(`Delete holiday "${holiday.name}"?`)) return;
    if (isActionLoading) return;

    try {
      setIsActionLoading(true);
      await deleteHoliday(holiday._id);
      setHolidays((prev) => prev.filter((item) => item._id !== holiday._id));
      if (editingHolidayId === holiday._id) {
        resetForm();
      }
      setStatusMessage({ type: "success", text: "Holiday deleted successfully." });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error?.response?.data?.message || "Failed to delete holiday.",
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
    if (!formData.name.trim() || !formData.date) {
      alert("Holiday name and date are required.")
      setStatusMessage({ type: "error", text: "Holiday name and date are required." });
      return;
    }
    if (isActionLoading) return;

    const payload = {
      vendorId,
      name: formData.name.trim(),
      date: formData.date,
      department: formData.department || null,
      type: formData.type,
      description: formData.description.trim(),
    };

    try {
      setIsActionLoading(true);
      setStatusMessage({ type: "", text: "" });

      if (editingHolidayId) {
        const res = await updateHoliday(editingHolidayId, payload);
        const updated = res?.data?.data;
        if (updated) {
          setHolidays((prev) =>
            prev.map((item) => (item._id === editingHolidayId ? updated : item))
          );
        } else {
          await fetchHolidays();
        }
        alert('Holiday updated successfully.')
        setStatusMessage({ type: "success", text: "Holiday updated successfully." });
        resetForm();
      } else {
        const res = await createHoliday(payload);
        const created = res?.data?.data;
        if (created) {
          setHolidays((prev) =>
            [...prev, created].sort(
              (a, b) => new Date(a.date) - new Date(b.date)
            )
          );
        } else {
          await fetchHolidays();
        }
        alert('Holiday created successfully.')
        setStatusMessage({ type: "success", text: "Holiday created successfully." });
        setFormData(initialFormState);
      }
    } catch (error) {
      alert(error?.response?.data?.message)
      setStatusMessage({
        type: "error",
        text: error?.response?.data?.message || "Failed to save holiday.",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const sortedHolidays = [...holidays].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  return (
    <div className="holiday-manager-container">
      <section className="holiday-list-section">
        <div className="holiday-list-header">
          <div>
            <h2>Holiday Calendar</h2>
            <p>Manage organization-wide and department-specific paid holidays.</p>
          </div>
          <div className="holiday-year-filter">
            <label htmlFor="holiday-year">Year</label>
            <select
              id="holiday-year"
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {statusMessage.text ? (
          <div className={`holiday-status holiday-status--${statusMessage.type}`}>
            {statusMessage.text}
          </div>
        ) : null}

        {loading ? (
          <p className="holiday-empty">Loading holidays...</p>
        ) : sortedHolidays.length === 0 ? (
          <p className="holiday-empty">No holidays configured for {filterYear}.</p>
        ) : (
          <div className="holiday-table-wrap">
            <table className="holiday-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Holiday</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedHolidays.map((holiday) => (
                  <tr key={holiday._id || `${holiday.name}-${holiday.date}`}>
                    <td>{formatDisplayDate(holiday.date)}</td>
                    <td>
                      <strong>{holiday.name}</strong>
                      {holiday.description ? (
                        <small>{holiday.description}</small>
                      ) : null}
                    </td>
                    <td>{holiday.department || "All Departments"}</td>
                    <td>
                      <span className={`holiday-type-badge holiday-type-badge--${holiday.type?.toLowerCase()}`}>
                        {holiday.type || "National"}
                      </span>
                    </td>
                    <td className="holiday-actions">
                      <button
                        type="button"
                        className="holiday-btn holiday-btn--ghost"
                        onClick={() => handleEditClick(holiday)}
                        disabled={holiday.source === "weekOff"}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="holiday-btn holiday-btn--danger"
                        onClick={() => handleDeleteClick(holiday)}
                        disabled={holiday.source === "weekOff"}
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

      <section ref={formRef} className="holiday-form-section">
        <h2>{editingHolidayId ? "Edit Holiday" : "Add Holiday"}</h2>
        <form className="holiday-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="holiday-name">Holiday Name</label>
            <input
              id="holiday-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Independence Day"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="holiday-date">Date</label>
              <input
                id="holiday-date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="holiday-type">Type</label>
              <select
                id="holiday-type"
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                {HOLIDAY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="holiday-department">Department</label>
            <select
              id="holiday-department"
              name="department"
              value={formData.department}
              onChange={handleChange}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id || dept.name} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="holiday-description">Description (optional)</label>
            <textarea
              id="holiday-description"
              name="description"
              rows="2"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional notes for HR"
            />
          </div>

          <div className="holiday-form-actions">
            {editingHolidayId ? (
              <button
                type="button"
                className="holiday-btn holiday-btn--ghost"
                onClick={resetForm}
                disabled={isActionLoading}
              >
                Cancel
              </button>
            ) : null}
            <button
              type="submit"
              className="holiday-btn holiday-btn--primary"
              disabled={isActionLoading}
            >
              {isActionLoading
                ? "Saving..."
                : editingHolidayId
                  ? "Update Holiday"
                  : "Add Holiday"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default HolidayManager;
