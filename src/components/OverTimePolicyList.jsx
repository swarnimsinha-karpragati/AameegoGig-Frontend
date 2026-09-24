import React, { useState, useEffect } from 'react';
import './OverTimePolicy.css';
import { useOvertimePolicies, useDeleteOvertimePolicy } from '../hooks/useSettings';
import Button from './Button';

export const OverTimePolicyList = ({ vendorId, onEditPolicy, refreshTrigger }) => {
  const { data: policiesRes, isLoading: isLoadingQuery, refetch } = useOvertimePolicies(vendorId);
  const deleteOvertimePolicyMutation = useDeleteOvertimePolicy();
  const [policies, setPolicies] = useState({ success: false, count: 0, data: [] });
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (policiesRes) {
      setPolicies(policiesRes);
    }
  }, [policiesRes]);

  useEffect(() => {
    if (refreshTrigger > 0) refetch();
  }, [refreshTrigger, refetch]);

  const handleDelete = async (policyId) => {
    if (!window.confirm('Are you sure you want to delete this overtime policy?')) return;
    if (isActionLoading) return;

    try {
      setIsActionLoading(true);
      setError('');
      await deleteOvertimePolicyMutation.mutateAsync(policyId);
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
        <h3>
          Configured Overtime Policies
          {policies?.data?.length > 0 ? ` (${policies.data.length})` : ""}
        </h3>
        <p>Review and manage overtime rules for your organization.</p>
      </div>

      {error && (
        <div className="ot-submit-status error" style={{ marginBottom: "12px" }}>
          {error}
        </div>
      )}

      {isLoadingQuery ? (
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
                        <Button
                          type="button"
                          onClick={() => onEditPolicy && onEditPolicy(policy)}
                          disabled={isActionLoading}
                          className="action-btn-edit"
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleDelete(currentId)}
                          disabled={isActionLoading}
                          className="action-btn-delete"
                        >
                          Delete
                        </Button>
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