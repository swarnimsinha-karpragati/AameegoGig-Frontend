import React, { useState, useEffect } from 'react';
import './OverTimePolicy.css';
import { deleteOvertimePolicy, getOvertimePolicies } from '../services/settingService';

export const OverTimePolicyList = ({ vendorId, onEditPolicy, refreshTrigger }) => {
  const [policies, setPolicies] = useState({ success: false, count: 0, data: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPolicies = async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await getOvertimePolicies(vendorId);
      
      if (res?.status === 200 || res?.success) {
        if (res.data && Array.isArray(res.data)) {
          setPolicies({
            success: true,
            count: res.data.length,
            data: res.data
          });
        } else if (res?.data?.data) {
          setPolicies(res.data);
        } else {
          setPolicies({ success: true, count: 0, data: [] });
        }
      } else {
        throw new Error(res?.data?.message || 'Failed to fetch overtime policies.');
      }
    } catch (err) {
      console.error('Error fetching policies:', err);
      setError(err.response?.data?.message || err.message || 'Unable to load policies.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) {
      fetchPolicies();
    }
  }, [vendorId, refreshTrigger]);

  const handleDelete = async (policyId) => {
    if (!window.confirm('Are you sure you want to delete this overtime policy?')) return;
    if (isActionLoading) return;

    try {
      setIsActionLoading(true);
      setError('');
      
      const res = await deleteOvertimePolicy(policyId);

      if (res?.status === 200 || res?.success) {
        setPolicies(prev => ({
          ...prev,
          count: (prev?.count || 1) - 1,
          data: prev?.data?.filter(p => (p._id || p.id) !== policyId) || []
        }));
      }
      
    } catch (err) {
      console.error('Error deleting policy:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete policy.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="ot-container">
      <div className="ot-header">
        <h1>Configured Overtime Policies {policies?.data?.length > 0 ? `(${policies?.data?.length})` : ''}</h1>
        <p>Review and manage all active operational strategy matrix rules assigned to your organization.</p>
      </div>

      {error && (
        <div className="ot-submit-status error" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="ot-list-loading">Loading policies...</div>
      ) : !policies?.data || policies.data.length === 0 ? (
        <div className="ot-list-empty">
          <p>No overtime policies configured yet.</p>
        </div>
      ) : (
        <div className="ot-table-wrapper">
          <table className="ot-table">
            <thead>
              <tr>
                <th>Policy Name</th>
                <th>Interval</th>
                <th>Action Rule</th>
                <th>Details</th>
                <th>Applicable Days</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.data.map((policy) => {
                const currentId = policy?._id || policy?.id;
                return (
                  <tr key={currentId}>
                    <td className="ot-td-bold">{policy?.policyName}</td>
                    <td>
                      <span className="ot-badge-gray">{policy?.triggerType}</span>
                    </td>
                    <td>
                      <span className={`ot-badge-action ${policy?.OverTimeAction?.replace(/\s+/g, '-').toLowerCase()}`}>
                        {policy?.OverTimeAction}
                      </span>
                    </td>
                    <td>
                      {/* Updated: rateMultiplier conditionally checked row was removed */}
                      {policy?.OverTimeAction === 'Incentive' && (
                        <span className="ot-text-muted">Incentive Applied</span>
                      )}
                      {policy?.OverTimeAction === 'Add Leave' && (
                        <span className="ot-text-muted">
                          Half: {policy?.halfDayThreshold / 60}h | Full: {policy?.fullDayThreshold / 60}h
                        </span>
                      )}
                      {policy?.OverTimeAction === 'None' && (
                        <span className="ot-text-muted">Logging Only</span>
                      )}
                    </td>
                    <td>
                      <div className="ot-table-days">
                        {policy.applicableDays?.map((day) => (
                          <span key={day} className="ot-day-mini-badge">
                            {day.substring(0, 3)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="ot-action-buttons-group">
                        <button
                          type="button"
                          onClick={() => onEditPolicy && onEditPolicy(policy)}
                          disabled={isActionLoading}
                          className="ot-row-btn-edit"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(currentId)}
                          disabled={isActionLoading}
                          className="ot-row-btn-delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};