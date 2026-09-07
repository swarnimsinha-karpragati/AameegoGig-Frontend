// eslint-disable-next-line
import React, { useState, useEffect } from 'react';
import { X, IndianRupee, AlertCircle } from 'lucide-react';
import SearchableEmployeeSelectServer from "../components/attendance/SearchableEmployeeSelectServer";
import './AdvanceLoanRequestForm.css';

const AdvanceLoanRequestForm = ({ open, onClose, onSubmit, employees = [], canApprove = false, loanConfig = null, apiError = "" }) => {
    const [formData, setFormData] = useState({
        requestType: 'ADVANCE',
        amount: '',
        reason: '',
        repaymentOption: 'MONTHLY_INSTALLMENTS',
        totalInstallments: 0,
        tenure: 0,
        repaymentAmount: '',
        isEmergency: false,
        priority: 'MEDIUM',
        employeeId: '',
    });

    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [monthlyBreakdown, setMonthlyBreakdown] = useState([]);
    const [derivedMonths, setDerivedMonths] = useState(0);
    const [showBreakdown, setShowBreakdown] = useState(false);

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
                repaymentAmount: '',
                isEmergency: false,
                priority: 'MEDIUM',
                employeeId: '',
            });
            setErrors({});
            setTouched({});
            setMonthlyBreakdown([]);
            setDerivedMonths(0);
        }
    }, [open]);

    useEffect(() => {
        const amount = Number(formData.amount) || 0;
        const isLoan = formData.requestType === 'LOAN';
        const isOneTime = formData.repaymentOption === 'ONE_TIME';
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (isOneTime && formData.tenure > 0) {
            // ONE_TIME manual repayment - single due month (not salary deducted)
            const totalInterest = isLoan && isLoanInterestEnabled ? (amount * loanInterestRate) / 100 : 0;
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + Number(formData.tenure));
            const dueMonth = months[dueDate.getMonth()];
            const dueYear = dueDate.getFullYear();
            setMonthlyBreakdown([{ month: dueMonth, year: dueYear, amount: Math.round(amount * 100) / 100, interestAmount: Math.round(totalInterest * 100) / 100, isOneTimeDue: true }]);
            setShowBreakdown(true);
        } else {
            setMonthlyBreakdown([]);
            setDerivedMonths(0);
            setShowBreakdown(false);
        }
    }, [formData.amount, formData.tenure, formData.requestType, formData.repaymentOption, formData.repaymentAmount, isLoanInterestEnabled, loanInterestRate]);

    const handleViewBreakup = () => {
        const amount = Number(formData.amount) || 0;
        if (amount <= 0 || !formData.repaymentAmount || Number(formData.repaymentAmount) <= 0) return;
        const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const totalInterest = isLoan && isLoanInterestEnabled ? (amount * loanInterestRate) / 100 : 0;
        const totalPayable = amount + totalInterest;
        const monthlyAmount = Number(formData.repaymentAmount);
        const numMonths = Math.max(1, Math.ceil(totalPayable / monthlyAmount));
        const monthlyInterest = numMonths > 0 ? Math.round((totalInterest / numMonths) * 100) / 100 : 0;
        let currentMonth = new Date().getMonth() + 1;
        let currentYear = new Date().getFullYear();
        if (currentMonth === 12) { currentMonth = 1; currentYear += 1; } else { currentMonth += 1; }
        const breakdown = [];
        for (let i = 1; i <= numMonths; i++) {
            if (currentMonth > 12) { currentMonth = 1; currentYear += 1; }
            const isLast = i === numMonths;
            let totalM = Math.round(monthlyAmount * 100) / 100;
            if (isLast) {
                const accounted = totalM * (numMonths - 1);
                totalM = Math.max(0, Math.round((totalPayable - accounted) * 100) / 100);
            }
            let interest_i = monthlyInterest;
            if (isLast) {
                interest_i = Math.max(0, Math.round((totalInterest - monthlyInterest * (numMonths - 1)) * 100) / 100);
            }
            const principal_i = Math.max(0, Math.round((totalM - interest_i) * 100) / 100);
            breakdown.push({ month: months[currentMonth - 1], year: currentYear, amount: principal_i, interestAmount: interest_i });
            currentMonth += 1;
        }
        setMonthlyBreakdown(breakdown);
        setDerivedMonths(numMonths);
        setShowBreakdown(true);
    };

    const handleChange = (field) => (e) => {
        const rawValue = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        const nextForm = {
            ...formData,
            [field]: rawValue,
            // Loans are always repaid via monthly installments (no one-time option).
            ...(field === 'requestType' && rawValue === 'LOAN' ? { repaymentOption: 'MONTHLY_INSTALLMENTS' } : {}),
        };
        setFormData(nextForm);
        setErrors((prev) => {
            const next = { ...prev };
            if (next[field]) delete next[field];
            // Live validation: monthly installment cannot exceed total payable.
            if (nextForm.repaymentOption === 'MONTHLY_INSTALLMENTS' && Number(nextForm.repaymentAmount) > 0) {
                const totalInterest = nextForm.requestType === 'LOAN' && isLoanInterestEnabled ? (Number(nextForm.amount || 0) * loanInterestRate) / 100 : 0;
                const totalPayable = Number(nextForm.amount || 0) + totalInterest;
                if (Number(nextForm.repaymentAmount) > totalPayable) {
                    next.repaymentAmount = `Monthly amount cannot exceed total payable of ₹${totalPayable.toLocaleString()}`;
                } else {
                    delete next.repaymentAmount;
                }
            }
            // Live validation: amount must be positive / within caps.
            if (nextForm.requestType && Number(nextForm.amount) > 0) {
                if (nextForm.requestType === 'ADVANCE' && maxAdvanceAmount > 0 && Number(nextForm.amount) > maxAdvanceAmount) {
                    next.amount = `Advance cannot exceed ₹${maxAdvanceAmount.toLocaleString()}`;
                } else if (nextForm.requestType === 'LOAN' && maxLoanAmount > 0 && Number(nextForm.amount) > maxLoanAmount) {
                    next.amount = `Loan cannot exceed ₹${maxLoanAmount.toLocaleString()}`;
                } else {
                    delete next.amount;
                }
            }
            return next;
        });
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
            case 'repaymentAmount':
                if (formData.repaymentOption === 'MONTHLY_INSTALLMENTS' && (!value || Number(value) <= 0)) {
                    newErrors.repaymentAmount = 'Monthly installment amount must be greater than 0';
                } else if (formData.repaymentOption === 'MONTHLY_INSTALLMENTS' && Number(value) > 0) {
                    const totalInterest = formData.requestType === 'LOAN' && isLoanInterestEnabled ? (formData.amount * loanInterestRate) / 100 : 0;
                    const totalPayable = Number(formData.amount || 0) + totalInterest;
                    if (Number(value) > totalPayable) {
                        newErrors.repaymentAmount = `Monthly amount cannot exceed total payable of ₹${totalPayable.toLocaleString()}`;
                    } else {
                        delete newErrors.repaymentAmount;
                    }
                }
                break;
            case 'tenure':
                if (formData.repaymentOption === 'ONE_TIME' && (!value || Number(value) <= 0)) {
                    newErrors.tenure = 'Tenure must be greater than 0 months';
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
        if (formData.repaymentOption === 'MONTHLY_INSTALLMENTS' && (!formData.repaymentAmount || Number(formData.repaymentAmount) <= 0)) {
            newErrors.repaymentAmount = 'Monthly installment amount must be greater than 0';
        } else if (formData.repaymentOption === 'MONTHLY_INSTALLMENTS' && Number(formData.repaymentAmount) > 0) {
            const totalInterest = formData.requestType === 'LOAN' && isLoanInterestEnabled ? (formData.amount * loanInterestRate) / 100 : 0;
            const totalPayable = Number(formData.amount) + totalInterest;
            if (Number(formData.repaymentAmount) > totalPayable) {
                newErrors.repaymentAmount = `Monthly amount cannot exceed total payable of ₹${totalPayable.toLocaleString()}`;
            }
        }
        if (formData.repaymentOption === 'ONE_TIME' && (!formData.tenure || Number(formData.tenure) <= 0)) {
            newErrors.tenure = 'Tenure must be greater than 0 months';
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
            totalInstallments: formData.repaymentOption === 'MONTHLY_INSTALLMENTS' ? (derivedMonths || 0) : (Number(formData.totalInstallments) || 0),
            tenure: Number(formData.tenure) || 0,
            repaymentAmount: Number(formData.repaymentAmount) || 0,
        };

        onSubmit(submitData);
    };

    if (!open) return null;

    const isLoan = formData.requestType === 'LOAN';
    const isOneTime = formData.repaymentOption === 'ONE_TIME';
    const showTenure = isOneTime;
    const showMonthlyInstallments = formData.repaymentOption === 'MONTHLY_INSTALLMENTS';
    const showInterestInfo = isLoan && isLoanInterestEnabled && loanInterestRate > 0;

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
                    {apiError && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fef2f2", border: "1px solid #fecaca", borderLeft: "4px solid #dc2626", color: "#dc2626", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontSize: "0.875rem", fontWeight: 600 }}>
                            <AlertCircle size={16} />
                            <span>{apiError}</span>
                        </div>
                    )}
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
                                        onBlur={() => setTouched({ ...touched, requestType: true })}
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
                                        onBlur={() => setTouched({ ...touched, requestType: true })}
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
                                    Interest Rate: {loanInterestRate}% (applicable for all loans)
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
                                {!isLoan && (
                                    <label className="alf-radio-option">
                                        <input
                                            type="radio"
                                            value="ONE_TIME"
                                            checked={formData.repaymentOption === 'ONE_TIME'}
                                            onChange={handleChange('repaymentOption')}
                                        />
                                        <span>One Time Payment</span>
                                    </label>
                                )}
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
                                    placeholder="Number of months"
                                    value={formData.tenure}
                                    onChange={handleChange('tenure')}
                                    onBlur={handleBlur('tenure')}
                                    min="1"
                                />
                                {errors.tenure && (
                                    <span className="alf-error-text">{errors.tenure}</span>
                                )}
                                <span className="alf-hint-text">Due after this many months. Manual repayment - not deducted from salary.</span>
                            </div>
                        )}

                        {showMonthlyInstallments && (
                            <div className="alf-form-group">
                                <label className="alf-label">Monthly Installment Amount (₹) *</label>
                                <div className="alf-input-wrapper">
                                    <span className="alf-input-prefix">₹</span>
                                    <input
                                        type="number"
                                        className={`alf-input alf-input-with-prefix ${errors.repaymentAmount ? 'alf-error' : ''}`}
                                        placeholder="How much you can pay each month"
                                        value={formData.repaymentAmount}
                                        onChange={handleChange('repaymentAmount')}
                                        onBlur={handleBlur('repaymentAmount')}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                {errors.repaymentAmount && (
                                    <span className="alf-error-text">{errors.repaymentAmount}</span>
                                )}
                                <span className="alf-hint-text">This amount will be deducted from your salary each month. {formData.repaymentAmount > 0 && Number(formData.amount) > 0 && (
                                    <button type="button" className="view-breakup-btn-inline" onClick={() => { if (showBreakdown) { setShowBreakdown(false); } else { handleViewBreakup(); } }}>
                                        {showBreakdown ? "Hide Breakup" : "View Breakup"}
                                    </button>
                                )}</span>
                            </div>
                        )}

                        {showBreakdown && monthlyBreakdown.length > 0 && (
                            <div className="alf-breakdown-preview">
                                <h4>{isOneTime ? "Due Preview (Manual Repayment - Not auto deducted)" : "Monthly Breakdown Preview (Salary Deduction)"}</h4>
                                {isOneTime && <p className="alf-hint-text" style={{ marginBottom: "8px", color: "#dc2626" }}>One-time payment is manual - you can repay anytime within the tenure. {isLoan ? "Total amount with interest is due in the due month." : "Full amount is due in the due month (no interest)."}</p>}
                                <div className="alf-breakdown-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Month</th>
                                                <th>Principal (₹)</th>
                                                <th>Interest (₹)</th>
                                                <th>Total (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthlyBreakdown.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>{item.month} {item.year}</td>
                                                    <td className="amount-cell">₹{item.amount.toLocaleString()}</td>
                                                    <td className="amount-cell">₹{(item.interestAmount || 0).toLocaleString()}</td>
                                                    <td className="amount-cell">₹{((item.amount || 0) + (item.interestAmount || 0)).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="alf-breakdown-total">
                                    <strong>Total Payable: ₹{monthlyBreakdown.reduce((sum, item) => sum + item.amount + (item.interestAmount || 0), 0).toLocaleString()}</strong>
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