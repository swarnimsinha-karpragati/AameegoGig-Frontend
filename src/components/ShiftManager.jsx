import React, { useState, useRef } from 'react';
import './ShiftManager.css';
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift } from '../hooks/useSettings';
import Button from './Button';

const ShiftManager = ({ vendorId }) => {
  const { data: shifts = [], isLoading: loading } = useShifts(vendorId);
  const createShiftMutation = useCreateShift();
  const updateShiftMutation = useUpdateShift();
  const deleteShiftMutation = useDeleteShift();
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
      await deleteShiftMutation.mutateAsync(shiftId);
      if (editingShiftId === shiftId) {
        handleCancelEdit();
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
        await updateShiftMutation.mutateAsync({ id: editingShiftId, data: payload });
        setEditingShiftId(null);
      } else {
        await createShiftMutation.mutateAsync(payload);
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
              className="shift-input"
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
                className="shift-input"
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
                className="shift-input"
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
              className="shift-input"
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
              <Button 
                type="button" 
                onClick={handleCancelEdit}
                disabled={isActionLoading}
                className="secondary-btn"
              >
                Cancel Edit
              </Button>
              
            )}
            <Button type="submit" disabled={isActionLoading}>
              {isActionLoading ? 'Saving...' : editingShiftId ? 'Update Shift Profile' : 'Save Changes'}
            </Button>
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
                      <Button
                        type="button"
                        onClick={() => handleDeleteClick(currentId)}
                        disabled={isActionLoading}
                        className="action-btn-delete"
                      >
                        Delete
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleEditClick(shift)}
                        disabled={isActionLoading}
                        className="action-btn-edit"
                      >
                        Edit
                      </Button>
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