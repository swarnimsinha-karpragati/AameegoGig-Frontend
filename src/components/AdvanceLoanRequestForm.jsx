import React, { useState } from 'react';
import { X, IndianRupee, AlertCircle } from 'lucide-react';
import './AdvanceLoanRequestForm.css';

const AdvanceLoanRequestForm = ({ open, onClose, onSubmit, employees = [], canApprove = false }) => {
    const [formData, setFormData] = useState({
        requestType: 'ADVANCE',
        amount: '',
        reason: '',
        repaymentOption: 'MONTHLY_INSTALLMENTS',
        totalInstallments: 0,
        isEmergency: false,
        priority: 'MEDIUM',
        employeeId: '',
    });

    const [errors, setErrors] = useState({});

    const handleChange = (field) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.requestType) {
            newErrors.requestType = 'Request type is required';
        }

        if (!formData.amount || Number(formData.amount) <= 0) {
            newErrors.amount = 'Amount must be greater than 0';
        }

        if (!formData.reason || !formData.reason.trim()) {
            newErrors.reason = 'Reason is required';
        }

        if (!formData.repaymentOption) {
            newErrors.repaymentOption = 'Repayment option is required';
        }

        

        if (formData.repaymentOption === 'MONTHLY_INSTALLMENTS' &&
            (!formData.totalInstallments || Number(formData.totalInstallments) <= 0)) {
            newErrors.totalInstallments = 'Total installments must be greater than 0';
        }

        if (canApprove && !formData.employeeId) {
            newErrors.employeeId = 'Employee is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        const submitData = {
            ...formData,
            amount: Number(formData.amount),
            totalInstallments: Number(formData.totalInstallments) || 0,
        };

        onSubmit(submitData);
    };

    if (!open) return null;

    return (
        <div className="alf-modal-overlay" onClick={onClose}>
            <div className="alf-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="alf-modal-header">
                    <div className="alf-header-content">
                        <div className="alf-header-icon">
                            <IndianRupee size={24} />
                        </div>
                        <div>
                            <h2 className="alf-title">
                                Request {formData.requestType === 'ADVANCE' ? 'Advance' : 'Loan'}
                                {formData.isEmergency && (
                                    <span className="alf-emergency-badge">
                                        <AlertCircle size={12} />
                                        Emergency
                                    </span>
                                )}
                            </h2>
                            <p className="alf-subtitle">Fill in the details to submit your request</p>
                        </div>
                    </div>
                    <button className="alf-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="alf-modal-body">
                    <div className="alf-form">
                        {/* Employee Select for Approvers */}
                        {canApprove && employees.length > 0 && (
                            <div className="alf-form-group">
                                <label className="alf-label">Employee *</label>
                                <select
                                    className={`alf-input ${errors.employeeId ? 'alf-error' : ''}`}
                                    value={formData.employeeId}
                                    onChange={handleChange('employeeId')}
                                >
                                    <option value="">Select Employee</option>
                                    {employees.map((emp) => (
                                        <option key={emp._id} value={emp._id}>
                                            {emp.employeeCode} — {emp.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.employeeId && (
                                    <span className="alf-error-text">{errors.employeeId}</span>
                                )}
                            </div>
                        )}

                        {/* Request Type */}
                        <div className="alf-form-group">
                            <label className="alf-label">Request Type *</label>
                            <div className="alf-radio-cards">
                                <label className={`alf-radio-card ${formData.requestType === 'ADVANCE' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        value="ADVANCE"
                                        checked={formData.requestType === 'ADVANCE'}
                                        onChange={handleChange('requestType')}
                                    />
                                    <span className="alf-radio-card-content">
                                        <strong>Advance</strong>
                                        <small>Salary advance</small>
                                    </span>
                                </label>
                                <label className={`alf-radio-card ${formData.requestType === 'LOAN' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        value="LOAN"
                                        checked={formData.requestType === 'LOAN'}
                                        onChange={handleChange('requestType')}
                                    />
                                    <span className="alf-radio-card-content">
                                        <strong>Loan</strong>
                                        <small>Personal loan</small>
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="alf-form-group">
                            <label className="alf-label">Amount (₹) *</label>
                            <div className="alf-input-wrapper">
                                <span className="alf-input-prefix">₹</span>
                                <input
                                    type="number"
                                    className={`alf-input alf-input-with-prefix ${errors.amount ? 'alf-error' : ''}`}
                                    placeholder="Enter the amount"
                                    value={formData.amount}
                                    onChange={handleChange('amount')}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            {errors.amount && (
                                <span className="alf-error-text">{errors.amount}</span>
                            )}
                        </div>

                        {/* Reason */}
                        <div className="alf-form-group">
                            <label className="alf-label">Reason *</label>
                            <textarea
                                className={`alf-input alf-textarea ${errors.reason ? 'alf-error' : ''}`}
                                placeholder="Explain why you need this advance/loan..."
                                value={formData.reason}
                                onChange={handleChange('reason')}
                                rows="3"
                            />
                            {errors.reason && (
                                <span className="alf-error-text">{errors.reason}</span>
                            )}
                        </div>

                        {/* Repayment Options */}
                        <div className="alf-form-group">
                            <label className="alf-label">Repayment Option *</label>
                            <div className="alf-radio-options">
                                <label className="alf-radio-option">
                                    <input
                                        type="radio"
                                        value="ONE_TIME"
                                        checked={formData.repaymentOption === 'ONE_TIME'}
                                        onChange={handleChange('repaymentOption')}
                                    />
                                    <span>One Time Payment</span>
                                </label>
                                <label className="alf-radio-option">
                                    <input
                                        type="radio"
                                        value="MONTHLY_INSTALLMENTS"
                                        checked={formData.repaymentOption === 'MONTHLY_INSTALLMENTS'}
                                        onChange={handleChange('repaymentOption')}
                                    />
                                    <span>Monthly Installments</span>
                                </label>
                            </div>
                        </div>

                        

                        {/* Total Installments */}
                        {formData.repaymentOption === 'MONTHLY_INSTALLMENTS' && (
                            <div className="alf-form-group">
                                <label className="alf-label">Total Installments *</label>
                                <input
                                    type="number"
                                    className={`alf-input ${errors.totalInstallments ? 'alf-error' : ''}`}
                                    placeholder="Number of months"
                                    value={formData.totalInstallments}
                                    onChange={handleChange('totalInstallments')}
                                    min="1"
                                />
                                {errors.totalInstallments && (
                                    <span className="alf-error-text">{errors.totalInstallments}</span>
                                )}
                            </div>
                        )}

                        {/* Priority */}
                        <div className="alf-form-group">
                            <label className="alf-label">Priority</label>
                            <select
                                className="alf-input"
                                value={formData.priority}
                                onChange={handleChange('priority')}
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>

                        {/* Emergency Checkbox */}
                        <div className="alf-form-group">
                            <label className="alf-checkbox">
                                <input
                                    type="checkbox"
                                    checked={formData.isEmergency}
                                    onChange={handleChange('isEmergency')}
                                />
                                <span className="alf-checkbox-text">
                                    Mark as Emergency Request
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="alf-modal-footer">
                    <button className="alf-btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="alf-btn-primary" onClick={handleSubmit}>
                        <IndianRupee size={16} />
                        Submit Request
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdvanceLoanRequestForm;