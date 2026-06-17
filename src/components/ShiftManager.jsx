import React, { useState, useEffect } from 'react';
import './ShiftManager.css';
import { createShift, getShift } from '../services/settingService';

const ShiftManager = ({ vendorId }) => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  // const [vendorId,setVendorId] = useState(null)
  // useEffect(()=>{
  //   setVendorId(user?.vendorId)
  // },[user])
  // console.log(user.id)

  const [formData, setFormData] = useState({
    shiftName: 'General',
    startTime: '',
    endTime: '',
    graceTime: 0
  });

  useEffect(() => {
    const fetchExistingShifts = async () => {
      if (!vendorId) return;
      
      try {
        setLoading(true);
        const res = await getShift(vendorId);
        
        const shiftData = res?.data?.data || res?.data || [];
        console.log(shiftData)
        setShifts(shiftData);
      } catch (error) {
        console.error("Failed to load shifts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExistingShifts();
  }, [vendorId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'graceTime' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!vendorId) {
      alert("Vendor configuration not found. Make sure you are logged in.");
      return;
    }

    try {
      const payload = {
        ...formData,
        vendorId: vendorId
      };

      const res = await createShift(payload);
      const newShift = res?.data?.data || res?.data;

      if (newShift) {
        
        setShifts((prevShifts) => [...prevShifts, newShift]);
      }
      
      resetForm();
    } catch (error) {
      console.error("Failed to save shift:", error);
      alert(error?.response?.data?.message || "Something went wrong saving the shift.");
    }
  };

  const resetForm = () => {
    setFormData({
      shiftName: 'General',
      startTime: '',
      endTime: '',
      graceTime: 0
    });
  };

  return (
    <div className="shift-manager-container">
      {/* FORM SECTION */}
      <div className="shift-form-section">
        <h2>Create New Shift</h2>
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
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* DISPLAY SHIFTS LIST */}
      <div className="shift-list-section">
        <h2>Existing Shifts ({shifts?.length})</h2>
        
        {loading ? (
          <p className="loading-shifts">Loading shift profiles...</p>
        ) : shifts?.length === 0 ? (
          <p className="no-shifts">No shifts configured yet.</p>
        ) : (
          <div className="shifts-grid">
            {shifts.map((shift) => (
              <div key={shift._id || Math.random()} className="shift-card">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default ShiftManager;