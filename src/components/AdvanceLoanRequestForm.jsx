// eslint-disable-next-line
import React, { useState, useEffect } from 'react';
import { X, IndianRupee, AlertCircle } from 'lucide-react';
import SearchableEmployeeSelectServer from "../components/attendance/SearchableEmployeeSelectServer";
import './AdvanceLoanRequestForm.css';

const AdvanceLoanRequestForm = ({ open, onClose, onSubmit, employees = [], canApprove = false, loanConfig = null }) => {
    const [formData, setFormData] = useState({
        requestType: 'ADVANCE',
        amount: '',
        reason: '',
        repaymentOption: 'MONTHLY_INSTALLMENTS',
        totalInstallments: 0,
        tenure: 0,
        isEmergency: false,
        priority: 'MEDIUM',
        employeeId: '',
    });

    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [monthlyBreakdown, setMonthlyBreakdown] = useState([]);

    const maxTenure = loanConfig?.maxTenureMonths || 6;
    const maxAdvanceAmount = loanConfig?.maxAdvanceAmount || 0;
    const maxLoanAmount = loanConfig?.maxLoanAmount || 0;
    const loanInterestRate = loanConfig?.loanInterestRate || 0;
    const isLoanInterestEnabled = loanConfig?.isLoanInterestEnabled !== false;

    useEffect(() => {
        if (!open) {
            setFormData({
                requestType: 'ADVANCE',
                amount: '',
                reason: '',
                repaymentOption: 'MONTHLY_INSTALLMENTS',
                totalInstallments: 0,
                tenure: 0,
                isEmergency: false,
                priority: 'MEDIUM',
                employeeId: '',
            });
            setErrors({});
            setTouched({});
            setMonthlyBreakdown([]);
        }
    }, [open]);

    useEffect(() => {
        if (formData.requestType === 'LOAN' && isLoanInterestEnabled && Number(formData.amount) > 200000) {
            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const now = new Date();
            let currentMonth = now.getMonth() + 1;
            let currentYear = now.getFullYear();
            const monthlyAmount = Number(formData.amount) / (formData.totalInstallments || 6);
            const totalInterest = (Number(formData.amount) * loanInterestRate) / 100;
            const interestPerMonth = totalInterest / (formData.totalInstallments || 6);
            const breakdown = [];
            for (let i = 1; i <= (formData.totalInstallments || 6); i++) {
                if (currentMonth > 12) {
                    currentMonth = 1;
                    currentYear += 1;
                }
                breakdown.push({
                    month: months[currentMonth - 1],
                    year: currentYear,
                    amount: Math.round(monthlyAmount * 100) / 100,
                    interestAmount: Math.round(interestPerMonth * 100) / 100,
                });
                currentMonth += 1;
            }
            setMonthlyBreakdown(breakdown);
        } else if (formData.requestType === 'LOAN' && formData.repaymentOption === 'ONE_TIME' && formData.tenure > 0) {
            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const now = new Date();
            let currentMonth = now.getMonth() + 1;
            let currentYear = now.getFullYear();
            const monthlyAmount = Number(formData.amount) / formData.tenure;
            const totalInterest = (Number(formData.amount) * loanInterestRate) / 100;
            const interestPerMonth = totalInterest / formData.tenure;
            const breakdown = [];
            for (let i = 1; i <= formData.tenure; i++) {
                if (currentMonth > 12) {
                    currentMonth = 1;
                    currentYear += 1;
                }
                breakdown.push({
                    month: months[currentMonth - 1],
                    year: currentYear,
                    amount: Math.round(monthlyAmount * 100) / 100,
                    interestAmount: Math.round(interestPerMonth * 100) / 100,
                });
                currentMonth += 1;
            }
            setMonthlyBreakdown(breakdown);
        } else {
            setMonthlyBreakdown([]);
        }
    }, [formData.amount, formData.totalInstallments, formData.tenure, formData.requestType, isLoanInterestEnabled, loanInterestRate]);

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

    const handleBlur = (field) => () => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        validateField(field);
    };

    const validateField = (field) => {
        const newErrors = { ...errors };
        const value = formData[field];

        switch (field) {
            case 'requestType':
                if (!value) newErrors.requestType = 'Request type is required';
                break;
            case 'amount':
                if (!value || Number(value) <= 0) {
                    newErrors.amount = 'Amount must be greater than 0';
                } else if (formData.requestType === 'ADVANCE' && maxAdvanceAmount > 0 && Number(value) > maxAdvanceAmount) {
                    newErrors.amount = `Advance cannot exceed ₹${maxAdvanceAmount.toLocaleString()}`;
                } else if (formData.requestType === 'LOAN' && maxLoanAmount > 0 && Number(value) > maxLoanAmount) {
                    newErrors.amount = `Loan cannot exceed ₹${maxLoanAmount.toLocaleString()}`;
                }
                break;
            case 'reason':
                if (!value || !value.trim()) newErrors.reason = 'Reason is required';
                break;
            case 'repaymentOption':
                if (!value) newErrors.repaymentOption = 'Repayment option is required';
                break;
            case 'totalInstallments':
                if (formData.repaymentOption === 'MONTHLY_INSTALLMENTS' && (!value || Number(value) <= 0)) {
                    newErrors.totalInstallments = 'Total installments must be greater than 0';
                }
                break;
            case 'tenure':
                if (formData.repaymentOption === 'ONE_TIME' && (!value || Number(value) <= 0)) {
                    newErrors.tenure = `Tenure must be between 1 and ${maxTenure} months`;
                } else if (formData.repaymentOption === 'ONE_TIME' && Number(value) > maxTenure) {
                    newErrors.tenure = `Maximum tenure is ${maxTenure} months`;
                }
                break;
            case 'employeeId':
                if (canApprove && !value) newErrors.employeeId = 'Employee is required';
                break;
            default:
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.requestType) newErrors.requestType = 'Request type is required';
        if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = 'Amount must be greater than 0';
        if (!formData.reason || !formData.reason.trim()) newErrors.reason = 'Reason is required';
        if (!formData.repaymentOption) newErrors.repaymentOption = 'Repayment option is required';
        if (formData.repaymentOption === 'MONTHLY_INSTALLMENTS' && (!formData.totalInstallments || Number(formData.totalInstallments) <= 0)) {
            newErrors.totalInstallments = 'Total installments must be greater than 0';
        }
        if (formData.repaymentOption === 'ONE_TIME' && (!formData.tenure || Number(formData.tenure) <= 0)) {
            newErrors.tenure = `Tenure must be between 1 and ${maxTenure} months`;
        }
        if (canApprove && !formData.employeeId) newErrors.employeeId = 'Employee is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        const submitData = {
            ...formData,
            amount: Number(formData.amount),
            totalInstallments: Number(formData.totalInstallments) || 0,
            tenure: Number(formData.tenure) || 0,
        };

        onSubmit(submitData);
    };

    if (!open) return null;

    const isLoan = formData.requestType === 'LOAN';
    const isOneTime = formData.repaymentOption === 'ONE_TIME';
    const showTenure = isOneTime;
    const showMonthlyInstallments = formData.repaymentOption === 'MONTHLY_INSTALLMENTS';
    const showInterestInfo = isLoan && isLoanInterestEnabled && Number(formData.amount) > 200000;

    return (
        <div className="alf-modal-overlay" onClick={onClose}>
            <div className="alf-modal" onClick={(e) => e.stopPropagation()}>
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

                <div className="alf-modal-body">
                    <div className="alf-form">
                        {canApprove && (
                            <div className="alf-form-group">
                                <label className="alf-label">Employee *</label>
                                <SearchableEmployeeSelectServer
                                    value={formData.employeeId}
                                    onChange={(empId) => handleChange('employeeId')(empId)}
                                    hasError={!!errors.employeeId}
                                    controlClassName="alf-input"
                                    placeholder="Select Employee"
                                />
                                {errors.employeeId && (
                                    <span className="alf-error-text">{errors.employeeId}</span>
                                )}
                            </div>
                        )}

                        <div className="alf-form-group">
                            <label className="alf-label">Request Type *</label>
                            <div className="alf-radio-cards">
                                <label className={`alf-radio-card ${formData.requestType === 'ADVANCE' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        value="ADVANCE"
                                        checked={formData.requestType === 'ADVANCE'}
                                        onChange={handleChange('requestType')}
                                        onBlur={() => setTouched({...touched, requestType: true})}
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
                                        onBlur={() => setTouched({...touched, requestType: true})}
                                    />
                                    <span className="alf-radio-card-content">
                                        <strong>Loan</strong>
                                        <small>Personal loan</small>
                                    </span>
                                </label>
                            </div>
                            {errors.requestType && (
                                <span className="alf-error-text">{errors.requestType}</span>
                            )}
                        </div>

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
                                    onBlur={handleBlur('amount')}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            {errors.amount && (
                                <span className="alf-error-text">{errors.amount}</span>
                            )}
                            {isLoan && maxLoanAmount > 0 && (
                                <span className="alf-hint-text">Max loan amount: ₹{maxLoanAmount.toLocaleString()}</span>
                            )}
                            {formData.requestType === 'ADVANCE' && maxAdvanceAmount > 0 && (
                                <span className="alf-hint-text">Max advance amount: ₹{maxAdvanceAmount.toLocaleString()}</span>
                            )}
                        </div>

                        {showInterestInfo && (
                            <div className="alf-interest-info">
                                <span className="alf-interest-badge">
                                    Interest Rate: {loanInterestRate}% (applicable for loans above ₹2,00,000)
                                </span>
                            </div>
                        )}

                        <div className="alf-form-group">
                            <label className="alf-label">Reason *</label>
                            <textarea
                                className={`alf-input alf-textarea ${errors.reason ? 'alf-error' : ''}`}
                                placeholder="Explain why you need this advance/loan..."
                                value={formData.reason}
                                onChange={handleChange('reason')}
                                onBlur={handleBlur('reason')}
                                rows="3"
                            />
                            {errors.reason && (
                                <span className="alf-error-text">{errors.reason}</span>
                            )}
                        </div>

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
                            {errors.repaymentOption && (
                                <span className="alf-error-text">{errors.repaymentOption}</span>
                            )}
                        </div>

                        {showTenure && (
                            <div className="alf-form-group">
                                <label className="alf-label">Tenure (Months) *</label>
                                <input
                                    type="number"
                                    className={`alf-input ${errors.tenure ? 'alf-error' : ''}`}
                                    placeholder={`Number of months (max ${maxTenure})`}
                                    value={formData.tenure}
                                    onChange={handleChange('tenure')}
                                    onBlur={handleBlur('tenure')}
                                    min="1"
                                    max={maxTenure}
                                />
                                {errors.tenure && (
                                    <span className="alf-error-text">{errors.tenure}</span>
                                )}
                                <span className="alf-hint-text">Maximum {maxTenure} months allowed</span>
                            </div>
                        )}

                        {showMonthlyInstallments && (
                            <div className="alf-form-group">
                                <label className="alf-label">Total Installments *</label>
                                <input
                                    type="number"
                                    className={`alf-input ${errors.totalInstallments ? 'alf-error' : ''}`}
                                    placeholder="Number of months"
                                    value={formData.totalInstallments}
                                    onChange={handleChange('totalInstallments')}
                                    onBlur={handleBlur('totalInstallments')}
                                    min="1"
                                />
                                {errors.totalInstallments && (
                                    <span className="alf-error-text">{errors.totalInstallments}</span>
                                )}
                            </div>
                        )}

                        {monthlyBreakdown.length > 0 && (
                            <div className="alf-breakdown-preview">
                                <h4>Monthly Breakdown Preview</h4>
                                <div className="alf-breakdown-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Month</th>
                                                <th>Amount (₹)</th>
                                                {isLoan && showInterestInfo && <th>Interest (₹)</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthlyBreakdown.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>{item.month} {item.year}</td>
                                                    <td className="amount-cell">₹{item.amount.toLocaleString()}</td>
                                                    {isLoan && showInterestInfo && (
                                                        <td className="amount-cell">₹{item.interestAmount.toLocaleString()}</td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="alf-breakdown-total">
                                    <strong>Total Payable: ₹{monthlyBreakdown.reduce((sum, item) => sum + item.amount + (isLoan ? item.interestAmount : 0), 0).toLocaleString()}</strong>
                                </div>
                            </div>
                        )}

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

                        <div className="alf-form-group checkbox-group">
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