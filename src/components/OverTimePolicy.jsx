import React, { useState, useEffect } from 'react';
import './OverTimePolicy.css';
import { createOvertimePolicy, updateOvertimePolicy } from '../services/settingService';

export const OverTimePolicy = ({ vendorId, editingPolicy, onSuccess, onCancel }) => {
  const initialFormState = {
    policyName: '',
    OverTimeAction: 'Increase Salary', 
    triggerType: 'Daily',
    rateMultiplier: 1,
    halfDayThresholdHours: 4, 
    fullDayThresholdHours: 8, 
    applicableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  };

  const [policyData, setPolicyData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    if (editingPolicy) {
      setPolicyData({
        policyName: editingPolicy.policyName || '',
        OverTimeAction: editingPolicy.OverTimeAction || 'Increase Salary',
        triggerType: editingPolicy.triggerType || 'Daily',
        rateMultiplier: editingPolicy.rateMultiplier || 1,
        halfDayThresholdHours: editingPolicy.halfDayThreshold ? editingPolicy.halfDayThreshold / 60 : 0,
        fullDayThresholdHours: editingPolicy.fullDayThreshold ? editingPolicy.fullDayThreshold / 60 : 0,
        applicableDays: editingPolicy.applicableDays || []
      });
    } else {
      setPolicyData(initialFormState);
    }
  }, [editingPolicy]);

  useEffect(() => {
    if (submitStatus.message) {
      const timer = setTimeout(() => {
        setSubmitStatus({ type: '', message: '' });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [submitStatus.message]);

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
    'Friday', 'Saturday', 'Sunday'
  ];

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setPolicyData(prev => ({
      ...prev,
      [name]: type === 'number' 
        ? (value === '' ? '' : parseFloat(value))
        : value
    }));
  };

  const toggleDay = (day) => {
    setPolicyData(prev => ({
      ...prev,
      applicableDays: prev.applicableDays.includes(day)
        ? prev.applicableDays.filter(d => d !== day)
        : [...prev.applicableDays, day]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus({ type: '', message: '' });

    try {
      if (!policyData.policyName.trim()) {
        throw new Error("Policy name is required.");
      }

      const halfDayHours = Number(policyData.halfDayThresholdHours) || 0;
      const fullDayHours = Number(policyData.fullDayThresholdHours) || 0;

      if (policyData.OverTimeAction === 'Add Leave') {
        if (halfDayHours <= 0 || fullDayHours <= 0) {
          throw new Error("Threshold hours must be greater than zero.");
        }
        if (halfDayHours >= fullDayHours) {
          throw new Error("Full-day threshold must be greater than the half-day threshold.");
        }
      }

      const payload = {
        vendorId: vendorId,
        policyName: policyData.policyName.trim(),
        OverTimeAction: policyData.OverTimeAction,
        triggerType: policyData.triggerType,
        rateMultiplier: Number(policyData.rateMultiplier) || 1,
        halfDayThreshold: halfDayHours * 60, 
        fullDayThreshold: fullDayHours * 60, 
        applicableDays: Array.isArray(policyData.applicableDays) ? policyData.applicableDays : []
      };

      let res;
      if (editingPolicy) {
        const policyId = editingPolicy._id || editingPolicy.id;
        res = await updateOvertimePolicy(policyId, payload);
      } else {
        res = await createOvertimePolicy(payload);
      }

      if (res?.status === 200 || res?.status === 201 || res?.success) {
        setSubmitStatus({
          type: 'success',
          message: editingPolicy 
            ? 'Overtime policy has been successfully updated.' 
            : 'Overtime policy has been successfully configured and saved.'
        });
        
        if (!editingPolicy) {
          setPolicyData(initialFormState);
        }
        
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1000);
        }
      } else {
        throw new Error(res?.data?.message || 'Failed to save policy configuration.');
      }

    } catch (error) {
      console.error('Overtime submission error details:', error);
      setSubmitStatus({
        type: 'error',
        message: error.response?.data?.message || error.message || 'A network error occurred. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ot-container">
      <div className="ot-header">
        <h1>{editingPolicy ? 'Modify Overtime Policy' : 'Overtime Policy Configuration'}</h1>
        <p>Define triggers and compensation actions matching your organizational schema rules.</p>
      </div>

      <form onSubmit={handleSubmit} className="ot-form">
        
        <div className="ot-section">
          <h3>1. Tracking Metrics</h3>
          <div className="ot-bg-box" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="ot-label">Policy Name</label>
              <input
                type="text"
                name="policyName"
                placeholder="e.g., Standard Weekday Overtime"
                value={policyData.policyName}
                onChange={handleInputChange}
                className="ot-input"
                required
              />
            </div>

            <div className="ot-grid-2">
              <div>
                <label className="ot-label">Trigger Interval</label>
                <select
                  name="triggerType"
                  value={policyData.triggerType}
                  onChange={handleInputChange}
                  className="ot-select"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              
              <div className="ot-info-text">
                Determines the window over which cumulative overtime thresholds will execute.
              </div>
            </div>
          </div>
        </div>

        <hr className="ot-divider" />
        
        <div className="ot-section">
          <h3>2. Overtime Action Rules</h3>
          
          <div className="ot-strategy-group">
            <label className={`ot-card ${policyData.OverTimeAction === 'Increase Salary' ? 'active' : ''}`}>
              <div className="ot-card-title">
                <span>Increase Salary</span>
                <input 
                  type="radio" 
                  name="OverTimeAction" 
                  value="Increase Salary" 
                  checked={policyData.OverTimeAction === 'Increase Salary'} 
                  onChange={handleInputChange} 
                />
              </div>
              <p>Provide direct operational financial payout increments.</p>
            </label>

            <label className={`ot-card ${policyData.OverTimeAction === 'Add Leave' ? 'active' : ''}`}>
              <div className="ot-card-title">
                <span>Add Leave</span>
                <input 
                  type="radio" 
                  name="OverTimeAction" 
                  value="Add Leave" 
                  checked={policyData.OverTimeAction === 'Add Leave'} 
                  onChange={handleInputChange} 
                />
              </div>
              <p>Convert excess hours into half-day or full-day leaves.</p>
            </label>

            <label className={`ot-card ${policyData.OverTimeAction === 'None' ? 'active' : ''}`}>
              <div className="ot-card-title">
                <span>No Action</span>
                <input 
                  type="radio" 
                  name="OverTimeAction" 
                  value="None" 
                  checked={policyData.OverTimeAction === 'None'} 
                  onChange={handleInputChange} 
                />
              </div>
              <p>Log overtime for metrics without adding leaves or pay tier variances.</p>
            </label>
          </div>

          {policyData.OverTimeAction === 'Increase Salary' && (
            <div className="ot-sub-panel">
              <label className="ot-label">Salary Rate Multiplier</label>
              <div className="ot-input-inline">
                <input
                  type="number"
                  step="0.1"
                  name="rateMultiplier"
                  value={policyData.rateMultiplier}
                  onChange={handleInputChange}
                  min="1"
                  className="ot-input"
                />
                <span>× regular base wage payout</span>
              </div>
            </div>
          )}

          {policyData.OverTimeAction === 'Add Leave' && (
            <div className="ot-grid-2 ot-sub-panel">
              <div>
                <label className="ot-label">Half-Day Leave Trigger</label>
                <div className="ot-relative-input">
                  <input
                    type="number"
                    name="halfDayThresholdHours"
                    value={policyData.halfDayThresholdHours ?? ''}
                    onChange={handleInputChange}
                    className="ot-input"
                  />
                  <span className="ot-unit-badge">hours ({ (Number(policyData.halfDayThresholdHours) || 0) * 60 }m)</span>
                </div>
              </div>
              <div>
                <label className="ot-label">Full-Day Leave Trigger</label>
                <div className="ot-relative-input">
                  <input
                    type="number"
                    name="fullDayThresholdHours"
                    value={policyData.fullDayThresholdHours ?? ''}
                    onChange={handleInputChange}
                    className="ot-input"
                  />
                  <span className="ot-unit-badge">hours ({ (Number(policyData.fullDayThresholdHours) || 0) * 60 }m)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <hr className="ot-divider" />

        <div className="ot-section">
          <h3>3. Applicable Custom Shift Days</h3>
          <div className="ot-days-flex">
            {daysOfWeek.map((day) => {
              const isSelected = policyData.applicableDays.includes(day);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`ot-day-btn ${isSelected ? 'active' : ''}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {submitStatus.message && (
          <div className={`ot-submit-status ${submitStatus.type}`}>
            {submitStatus.message}
          </div>
        )}

        <div className="ot-actions">
          <button 
            type="button" 
            className="ot-btn-secondary" 
            onClick={editingPolicy ? onCancel : undefined} 
            disabled={isSubmitting}
          >
            {editingPolicy ? 'Cancel Edit' : 'Cancel'}
          </button>
          <button type="submit" className="ot-btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : editingPolicy ? 'Update Rule Policy' : 'Save Rule Configuration'}
          </button>
        </div>

      </form>
    </div>
  );
};