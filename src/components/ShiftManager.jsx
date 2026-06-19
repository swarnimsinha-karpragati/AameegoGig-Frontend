import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import './ShiftManager.css';
import { createShift, getShift, updateShift, deleteShift } from '../services/settingService';

const ShiftManager = ({ vendorId }) => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState(null);

  // 1. Create the reference node element
  const shiftFormRef = useRef(null);

  const initialFormState = {
    shiftName: 'General',
    startTime: '',
    endTime: '',
    graceTime: 0
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchExistingShifts = async () => {
    if (!vendorId) return;
    try {
      setLoading(true);
      const res = await getShift(vendorId);
      const shiftData = res?.data?.data || res?.data || [];
      setShifts(shiftData);
    } catch (error) {
      console.error("Failed to load shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExistingShifts();
  }, [vendorId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'graceTime' ? Number(value) : value
    }));
  };

  const handleEditClick = (shift) => {
    setEditingShiftId(shift._id || shift.id);
    setFormData({
      shiftName: shift.shiftName,
      startTime: shift.startTime,
      endTime: shift.endTime,
      graceTime: shift.graceTime
    });

    if (shiftFormRef.current) {
      shiftFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCancelEdit = () => {
    setEditingShiftId(null);
    resetForm();
  };

  const handleDeleteClick = async (shiftId) => {
    if (!window.confirm("Are you sure you want to permanently delete this shift rule?")) return;
    if (isActionLoading) return;

    try {
      setIsActionLoading(true);
      const res = await deleteShift(shiftId);
      if (res?.status === 200 || res?.success) {
        setShifts((prevShifts) => prevShifts.filter(s => (s._id || s.id) !== shiftId));
        if (editingShiftId === shiftId) {
          handleCancelEdit();
        }
      }
    } catch (error) {
      console.error("Failed to delete shift:", error);
      alert(error?.response?.data?.message || "Something went wrong deleting the shift.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) {
      alert("Vendor configuration not found. Make sure you are logged in.");
      return;
    }
    if (isActionLoading) return;

    try {
      setIsActionLoading(true);
      const payload = { ...formData, vendorId };

      if (editingShiftId) {
        const res = await updateShift(editingShiftId, payload);
        const updatedShift = res?.data?.data || res?.data;

        if (updatedShift) {
          setShifts((prevShifts) =>
            prevShifts.map((s) => ((s._id || s.id) === editingShiftId ? updatedShift : s))
          );
        } else {
          await fetchExistingShifts();
        }
        setEditingShiftId(null);
      } else {
        const res = await createShift(payload);
        const newShift = res?.data?.data || res?.data;

        if (newShift) {
          setShifts((prevShifts) => [...prevShifts, newShift]);
        } else {
          await fetchExistingShifts();
        }
      }
      resetForm();
    } catch (error) {
      console.error("Failed to save shift:", error);
      alert(error?.response?.data?.message || "Something went wrong saving the shift.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
  };

  return (
    <div className="shift-manager-container">
      <div ref={shiftFormRef} className="shift-form-section">
        <h2>{editingShiftId ? 'Modify Shift Profile' : 'Create New Shift'}</h2>
        <form onSubmit={handleSubmit} className="shift-form">
          <div className="form-group">
            <label htmlFor="shiftName">Shift Name</label>
            <input
              type="text"
              id="shiftName"
              name="shiftName"
              value={formData?.shiftName}
              onChange={handleChange}
              required
              placeholder="e.g., Morning Shift"
              disabled={isActionLoading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">Start Time</label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={formData?.startTime}
                onChange={handleChange}
                required
                disabled={isActionLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="endTime">End Time</label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={formData?.endTime}
                onChange={handleChange}
                required
                disabled={isActionLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="graceTime">Grace Time (Minutes)</label>
            <input
              type="number"
              id="graceTime"
              name="graceTime"
              value={formData?.graceTime}
              onChange={handleChange}
              min="0"
              required
              disabled={isActionLoading}
            />
          </div>

          <div className="form-actions">
            {editingShiftId && (
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleCancelEdit}
                disabled={isActionLoading}
              >
                Cancel Edit
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={isActionLoading}>
              {isActionLoading ? 'Saving...' : editingShiftId ? 'Update Shift Profile' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="shift-list-section">
        <h2>Existing Shifts ({shifts?.length || 0})</h2>
        
        {loading ? (
          <p className="loading-shifts">Loading shift profiles...</p>
        ) : !shifts || shifts.length === 0 ? (
          <p className="no-shifts">No shifts configured yet.</p>
        ) : (
          <div className="shifts-grid">
            {shifts.map((shift) => {
              const currentId = shift._id || shift.id;
              return (
                <div key={currentId || Math.random()} className="shift-card">
                  <div className="shift-card-header">
                    <h3 className="shift-title">{shift.shiftName}</h3>
                    <span className="shift-badge">Active</span>
                  </div>
                  
                  <div className="shift-card-body">
                    <div className="time-info-container">
                      <div className="time-block">
                        <span className="time-label">Start</span>
                        <span className="time-value">{shift.startTime}</span>
                      </div>
                      <div className="time-divider">→</div>
                      <div className="time-block">
                        <span className="time-label">End</span>
                        <span className="time-value">{shift.endTime}</span>
                      </div>
                    </div>

                    <div className="grace-time-info">
                      <span className="grace-label">Grace Period:</span>
                      <span className="grace-value">{shift.graceTime} mins</span>
                    </div>

                    <div className="shift-card-actions-wrapper">
                      <button
                        type="button"
                        onClick={() => handleEditClick(shift)}
                        disabled={isActionLoading}
                        className="shift-action-btn-edit"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(currentId)}
                        disabled={isActionLoading}
                        className="shift-action-btn-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftManager;