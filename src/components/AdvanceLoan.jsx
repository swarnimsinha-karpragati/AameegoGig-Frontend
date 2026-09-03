import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
    IndianRupee,
    Clock3,
    CheckCircle2,
    Banknote,
    X,
    Users,
    RefreshCw,
    Settings,
    AlertTriangle,
    Wallet,
    BadgeCheck,
    Ban,
    Hourglass,
    Scale,
    MoreVertical,
    Eye,
    XCircle,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import ConfirmModal from "../components/ConfirmModal";
import { ToastProvider, useToast } from "../components/Toast";
import {
    createAdvanceLoanRequest,
    getMyRequests,
    getAllRequests,
    cancelRequest,
    approveRequest,
    rejectRequest,
    recordPayment,
    getStatistics,
    getRequestDetails,
    getLoanConfig,
} from "../services/advanceLoanService";
import { getEmployees } from "../services/employeeService";
import SearchableEmployeeSelectServer from "../components/attendance/SearchableEmployeeSelectServer";
import {
    getStoredUser,
    canApproveAdvanceLoan,
    canViewAllAdvanceLoan,
} from "../utils/roles";
import "./AdvanceLoanRequest.css";
import Card from "../components/Card";
import LoanConfiguration from "./LoanConfiguration";

const PAYMENT_METHODS = ["SALARY_DEDUCTION", "CASH", "BANK_TRANSFER", "OTHER"];

const STATUS_CLASS = {
    PENDING: "advance-status pending",
    APPROVED: "advance-status approved",
    REJECTED: "advance-status rejected",
    PARTIALLY_PAID: "advance-status partially-paid",
    FULLY_PAID: "advance-status fully-paid",
    CANCELLED: "advance-status cancelled",
};

const STATUS_LABELS = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    PARTIALLY_PAID: "Partially Paid",
    FULLY_PAID: "Fully Paid",
    CANCELLED: "Cancelled",
};

const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const getTypeLabel = (type) => {
    return type === "ADVANCE" ? "Advance" : "Loan";
};

const getRepaymentLabel = (req) => {
    if (!req?.repaymentOption) return "-";
    if (req.repaymentOption === "ONE_TIME") return `One Time Payment (${req.tenure || req.totalInstallments || 0} months)`;
    if (req.repaymentOption === "MONTHLY_INSTALLMENTS") return `Monthly Installments (${req.totalInstallments || 0} months)`;
    if (req.repaymentOption === "CUSTOM") return "Custom Schedule";
    return req.repaymentOption;
};

const getPriorityBadge = (priority, status) => {
    const classes = {
        LOW: "priority-low",
        MEDIUM: "priority-medium",
        HIGH: "priority-high",
        URGENT: status === "PENDING" ? "priority-urgent" : "priority-high",
    };
    return `priority-badge ${classes[priority] || "priority-medium"}`;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const formatDeductionMonth = (dm) => {
    if (!dm || dm.month == null || dm.year == null) return "-";
    const raw = String(dm.month).trim();
    const num = parseInt(raw, 10);
    // numeric "10" or "010" or 10 -> convert to month name
    if (!isNaN(num) && num >= 1 && num <= 12) {
        return `${MONTHS[num - 1]} ${dm.year}`;
    }
    // already month name like "October" or "Oct"
    return `${dm.month} ${dm.year}`;
};

/* ===========================
    SUMMARY CARDS
   =========================== */
function AdvanceLoanSummaryCards({ summary, labels = {}, showPrincipalRemaining = false }) {
    // Total Requested = principal amount (what user actually applied for, without interest)
    const totalRequested = summary.totalAmount || 0;
    // Approved = approved principal amount (without interest)
    const approvedAmount = summary.totalApprovedPrincipal || summary.totalApprovedAmount || summary.totalApproved || 0;
    // Remaining to Pay:
    //   Admin/Manager → remaining principal only (interest is employee's responsibility)
    //   Employee → full remaining including interest (what they actually owe)
    const remainingToPay = showPrincipalRemaining
        ? (summary.totalRemainingPrincipal ?? summary.totalRemainingAmount ?? 0)
        : (summary.totalRemainingAmount ?? summary.totalPendingAmount ?? 0);
    // Total Paid = what has been paid so far
    const totalPaid = summary.totalPaid || 0;

    const cards = [
        { key: "total", icon: IndianRupee, iconClass: "blue", value: formatCurrency(totalRequested), label: labels.total || "Total Requested" },
        { key: "approved", icon: CheckCircle2, iconClass: "green", value: formatCurrency(approvedAmount), label: labels.approved || "Approved" },
        { key: "remaining", icon: Wallet, iconClass: "orange", value: formatCurrency(remainingToPay), label: labels.remaining || "Remaining to Pay" },
        { key: "paid", icon: Banknote, iconClass: "purple", value: formatCurrency(totalPaid), label: labels.paid || "Total Paid" },
    ];

    return (
        <div className="advance-summary-grid">
            {cards.map(({ key, icon: Icon, iconClass, value, label }) => (
                <Card key={key} icon={<Icon size={22} />} iconClassName={iconClass} isInteractive={true}>
                    <Card.Header>{label}</Card.Header>
                    <Card.Body>{value}</Card.Body>
                </Card>
            ))}
        </div>
    );
}

/* ===========================
    ADMIN SUMMARY TILES
    Complete money-position view for the loan giver: kitna maanga, kitna
    approve+kaha, kitna aaya, kitna baki, aur counts.
   =========================== */
function AdminSummaryTiles({ summary }) {
    const tiles = [
        {
            key: "requests",
            icon: IndianRupee,
            iconClass: "blue",
            label: "Total Requested",
            value: formatCurrency(summary.totalAmount || 0),
            sub: `${summary.totalRequests || 0} requests`,
        },
        {
            key: "pending",
            icon: Hourglass,
            iconClass: "orange",
            label: "Pending Approvals",
            value: formatCurrency(summary.pendingApprovalAmount || 0),
            sub: `${summary.pendingRequests || 0} awaiting`,
        },
        {
            key: "approved",
            icon: CheckCircle2,
            iconClass: "green",
            label: "Approved / Given",
            value: formatCurrency(summary.givenTotal ?? summary.totalApprovedPrincipal ?? 0),
            sub: `${summary.approvedRequests || 0} active + ${summary.fullyPaidRequests || 0} cleared`,
        },
        {
            key: "recovered",
            icon: Banknote,
            iconClass: "purple",
            label: "Recovered",
            value: formatCurrency(summary.recoveredTotal ?? summary.totalPaid ?? 0),
            sub: "Repayments received",
        },
        {
            key: "outstanding",
            icon: Scale,
            iconClass: "red",
            label: "Outstanding",
            value: formatCurrency(summary.outstandingTotal ?? summary.totalRemainingPrincipal ?? 0),
            sub: "Principal yet to recover",
        },
        {
            key: "rejected",
            icon: Ban,
            iconClass: "gray",
            label: "Rejected",
            value: formatCurrency(summary.rejectedAmount || 0),
            sub: `${summary.rejectedRequests || 0} requests`,
        },
        {
            key: "cancelled",
            icon: Clock3,
            iconClass: "gray",
            label: "Cancelled",
            value: formatCurrency(summary.cancelledAmount || 0),
            sub: `${summary.cancelledRequests || 0} requests`,
        },
        {
            key: "fullypaid",
            icon: BadgeCheck,
            iconClass: "teal",
            label: "Cleared / Fully Paid",
            value: formatCurrency(summary.fullyPaidPrincipal || 0),
            sub: `${summary.fullyPaidRequests || 0} settled`,
        },
    ];

    return (
        <div className="advance-summary-grid advance-summary-grid--admin">
            {tiles.map(({ key, icon: Icon, iconClass, label, value, sub }) => (
                <Card key={key} icon={<Icon size={22} />} iconClassName={iconClass} isInteractive={true}>
                    <Card.Header>{label}</Card.Header>
                    <Card.Body>
                        {value}
                        {sub && <div className="admin-tile-sub">{sub}</div>}
                    </Card.Body>
                </Card>
            ))}
        </div>
    );
}

/* ===========================
    REQUEST SUMMARY BLOCK
    Shown inside approve/reject confirmation so the admin can clearly see the
    application details (incl. Repayment Option) before acting.
   =========================== */
function RequestSummaryBlock({ request, showEmployee = false }) {
    if (!request) return null;
    const isLoan = request.requestType === "LOAN";
    return (
        <div className="request-summary-block">
            {showEmployee && (
                <div className="request-summary-row">
                    <span className="rs-label">Employee</span>
                    <span className="rs-value">{request.employeeId?.name || request.employeeName || "-"}</span>
                </div>
            )}
            <div className="request-summary-row">
                <span className="rs-label">Type</span>
                <span className="rs-value">{getTypeLabel(request.requestType)}</span>
            </div>
            <div className="request-summary-row">
                <span className="rs-label">Amount</span>
                <span className="rs-value">{formatCurrency(request.amount)}</span>
            </div>
            {isLoan && request.interestAmount > 0 && (
                <div className="request-summary-row">
                    <span className="rs-label">Interest ({request.interestRate}%)</span>
                    <span className="rs-value">{formatCurrency(request.interestAmount)}</span>
                </div>
            )}
            <div className="request-summary-row">
                <span className="rs-label">Total Payable</span>
                <span className="rs-value">{formatCurrency(request.totalPayableAmount || request.amount)}</span>
            </div>
            <div className="request-summary-row request-summary-row--highlight">
                <span className="rs-label">Repayment Option</span>
                <span className="rs-value">{getRepaymentLabel(request)}</span>
            </div>
            {request.repaymentOption === "MONTHLY_INSTALLMENTS" && (
                <div className="request-summary-row">
                    <span className="rs-label">Monthly Installment</span>
                    <span className="rs-value">
                        {formatCurrency(request.approvedRepayment?.monthlyAmount || request.repaymentAmount || 0)}
                        {" / month"}
                        {(request.approvedRepayment?.totalInstallments || request.totalInstallments) > 0 && (
                            <> for {(request.approvedRepayment?.totalInstallments || request.totalInstallments)} months</>
                        )}
                    </span>
                </div>
            )}
            <div className="request-summary-row">
                <span className="rs-label">Requested Date</span>
                <span className="rs-value">{formatDate(request.createdAt)}</span>
            </div>
            {request.reason ? (
                <div className="request-summary-row">
                    <span className="rs-label">Reason</span>
                    <span className="rs-value">{request.reason}</span>
                </div>
            ) : null}
        </div>
    );
}

/* ===========================
    REQUEST FORM MODAL
   =========================== */
function RequestFormModal({ open, onClose, onSubmit, employees = [], canApprove = false, canCreate = true, loanConfig = null, apiError = "" }) {
    const [formData, setFormData] = useState({
        requestType: "ADVANCE",
        amount: "",
        reason: "",
        repaymentOption: "MONTHLY_INSTALLMENTS",
        totalInstallments: 0,
        tenure: 0,
        repaymentAmount: "",
        isEmergency: false,
        priority: "MEDIUM",
        employeeId: "",
    });

    const [errors, setErrors] = useState({});
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
                requestType: "ADVANCE",
                amount: "",
                reason: "",
                repaymentOption: "MONTHLY_INSTALLMENTS",
                totalInstallments: 0,
                tenure: 0,
                repaymentAmount: "",
                isEmergency: false,
                priority: "MEDIUM",
                employeeId: "",
            });
            setErrors({});
            setMonthlyBreakdown([]);
            setDerivedMonths(0);
        }
    }, [open]);

    useEffect(() => {
        const amount = Number(formData.amount) || 0;
        const isLoan = formData.requestType === "LOAN";
        const isOneTime = formData.repaymentOption === "ONE_TIME";

        if (isOneTime && formData.tenure > 0) {
            // ONE_TIME manual repayment - single due month, not salary deduction
            const totalInterest = isLoan && isLoanInterestEnabled ? (amount * loanInterestRate) / 100 : 0;
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + Number(formData.tenure));
            const dueMonth = MONTHS[dueDate.getMonth()];
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
        const totalInterest = isLoan && isLoanInterestEnabled ? (amount * loanInterestRate) / 100 : 0;
        const totalPayable = amount + totalInterest;
        const monthlyAmt = Number(formData.repaymentAmount);
        const numMonths = Math.max(1, Math.ceil(totalPayable / monthlyAmt));
        const monthlyInterest = numMonths > 0 ? Math.round((totalInterest / numMonths) * 100) / 100 : 0;
        let cm = new Date().getMonth() + 1;
        let cy = new Date().getFullYear();
        if (cm === 12) { cm = 1; cy += 1; } else { cm += 1; }
        const bd = [];
        for (let i = 1; i <= numMonths; i++) {
            if (cm > 12) { cm = 1; cy += 1; }
            const isLast = i === numMonths;
            let totalM = Math.round(monthlyAmt * 100) / 100;
            if (isLast) {
                const accounted = totalM * (numMonths - 1);
                totalM = Math.max(0, Math.round((totalPayable - accounted) * 100) / 100);
            }
            let interest_i = monthlyInterest;
            if (isLast) {
                interest_i = Math.max(0, Math.round((totalInterest - monthlyInterest * (numMonths - 1)) * 100) / 100);
            }
            const principal_i = Math.max(0, Math.round((totalM - interest_i) * 100) / 100);
            bd.push({ month: MONTHS[cm - 1], year: cy, amount: principal_i, interestAmount: interest_i });
            cm += 1;
        }
        setMonthlyBreakdown(bd);
        setDerivedMonths(numMonths);
        setShowBreakdown(true);
    };

    const handleChange = (field) => (e) => {
        const rawValue = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        const nextForm = {
            ...formData,
            [field]: rawValue,
            // Loans are always repaid via monthly installments (no one-time option).
            ...(field === "requestType" && rawValue === "LOAN" ? { repaymentOption: "MONTHLY_INSTALLMENTS" } : {}),
        };
        setFormData(nextForm);

        // Live validation for amount and monthly installment amount.
        setErrors((prev) => {
            const next = { ...prev };
            if (next[field]) delete next[field];
            if (nextForm.repaymentOption === "MONTHLY_INSTALLMENTS" && Number(nextForm.repaymentAmount) > 0) {
                const totalInterest = nextForm.requestType === "LOAN" && isLoanInterestEnabled ? (Number(nextForm.amount || 0) * loanInterestRate) / 100 : 0;
                const totalPayable = Number(nextForm.amount || 0) + totalInterest;
                if (Number(nextForm.repaymentAmount) > totalPayable) {
                    next.repaymentAmount = `Monthly amount cannot exceed total payable of ${formatCurrency(totalPayable)}`;
                } else {
                    delete next.repaymentAmount;
                }
            }
            if (nextForm.requestType && Number(nextForm.amount) > 0) {
                if (nextForm.requestType === "ADVANCE" && maxAdvanceAmount > 0 && Number(nextForm.amount) > maxAdvanceAmount) {
                    next.amount = `Advance cannot exceed ₹${maxAdvanceAmount.toLocaleString()}`;
                } else if (nextForm.requestType === "LOAN" && maxLoanAmount > 0 && Number(nextForm.amount) > maxLoanAmount) {
                    next.amount = `Loan cannot exceed ₹${maxLoanAmount.toLocaleString()}`;
                } else {
                    delete next.amount;
                }
            }
            return next;
        });
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.requestType) newErrors.requestType = "Request type is required";
        if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = "Amount must be greater than 0";
        if (formData.requestType === "ADVANCE" && maxAdvanceAmount > 0 && Number(formData.amount) > maxAdvanceAmount) {
            newErrors.amount = `Advance cannot exceed ₹${maxAdvanceAmount.toLocaleString()}`;
        }
        if (formData.requestType === "LOAN" && maxLoanAmount > 0 && Number(formData.amount) > maxLoanAmount) {
            newErrors.amount = `Loan cannot exceed ₹${maxLoanAmount.toLocaleString()}`;
        }
        if (!formData.reason || !formData.reason.trim()) newErrors.reason = "Reason is required";
        if (!formData.repaymentOption) newErrors.repaymentOption = "Repayment option is required";
        if (formData.repaymentOption === "MONTHLY_INSTALLMENTS" && (!formData.repaymentAmount || Number(formData.repaymentAmount) <= 0)) {
            newErrors.repaymentAmount = "Monthly installment amount must be greater than 0";
        } else if (formData.repaymentOption === "MONTHLY_INSTALLMENTS" && Number(formData.repaymentAmount) > 0) {
            const isLoan = formData.requestType === "LOAN";
            const totalInterest = isLoan && isLoanInterestEnabled ? (Number(formData.amount) * loanInterestRate) / 100 : 0;
            const totalPayable = Number(formData.amount) + totalInterest;
            if (Number(formData.repaymentAmount) > totalPayable) {
                newErrors.repaymentAmount = `Monthly amount cannot exceed total payable of ${formatCurrency(totalPayable)}`;
            }
        }
        if (formData.repaymentOption === "ONE_TIME" && (!formData.tenure || Number(formData.tenure) <= 0)) {
            newErrors.tenure = "Tenure must be greater than 0 months";
        }
        if (canApprove && !formData.employeeId) newErrors.employeeId = "Employee is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        onSubmit({
            ...formData,
            amount: Number(formData.amount),
            totalInstallments: formData.repaymentOption === "MONTHLY_INSTALLMENTS" ? (derivedMonths || 0) : (Number(formData.totalInstallments) || 0),
            tenure: Number(formData.tenure) || 0,
            repaymentAmount: Number(formData.repaymentAmount) || 0,
        });
    };

    if (!open) return null;

    const isLoan = formData.requestType === "LOAN";
    const isOneTime = formData.repaymentOption === "ONE_TIME";
    const showTenure = isOneTime;
    const showMonthlyInstallments = formData.repaymentOption === "MONTHLY_INSTALLMENTS";
    const showInterestInfo = isLoan && isLoanInterestEnabled && loanInterestRate > 0;

    return (
        <div className="advance-modal-overlay" onClick={onClose}>
            <div className="advance-modal" onClick={(e) => e.stopPropagation()}>
                <div className="advance-modal-header">
                    <h3>
                        Request {formData.requestType === "ADVANCE" ? "Advance" : "Loan"}
                        {formData.isEmergency && <span className="emergency-badge">⚠️ Emergency</span>}
                    </h3>
                    <button className="advance-modal-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="advance-modal-body">
                    <p className="advance-modal-subtitle">Fill in the details to submit your request</p>
                    {apiError && (
                        <div className="advance-error" style={{ marginBottom: "12px" }}>
                            <AlertTriangle size={16} />
                            <span>{apiError}</span>
                        </div>
                    )}

                    <div className="advance-form">
                        {canApprove && (
                            <div className="form-group">
                                <label>Employee *</label>
                                <SearchableEmployeeSelectServer
                                    value={formData.employeeId}
                                    onChange={(empId) => handleChange("employeeId")(empId)}
                                    hasError={!!errors.employeeId}
                                    controlClassName="form-control"
                                    placeholder="Select Employee"
                                />
                                {errors.employeeId && <span className="form-error">{errors.employeeId}</span>}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Request Type *</label>
                            <select
                                className={`form-control ${errors.requestType ? "error" : ""}`}
                                value={formData.requestType}
                                onChange={handleChange("requestType")}
                            >
                                <option value="ADVANCE">Advance</option>
                                <option value="LOAN">Loan</option>
                            </select>
                            {errors.requestType && <span className="form-error">{errors.requestType}</span>}
                        </div>

                        <div className="form-group">
                            <label>Amount (₹) *</label>
                            <input
                                type="number"
                                className={`form-control ${errors.amount ? "error" : ""}`}
                                placeholder="Enter the amount"
                                value={formData.amount}
                                onChange={handleChange("amount")}
                                min="0"
                                step="0.01"
                            />
                            {errors.amount && <span className="form-error">{errors.amount}</span>}
                            {isLoan && maxLoanAmount > 0 && <span className="form-hint">Max loan: ₹{maxLoanAmount.toLocaleString()}</span>}
                            {formData.requestType === "ADVANCE" && maxAdvanceAmount > 0 && <span className="form-hint">Max advance: ₹{maxAdvanceAmount.toLocaleString()}</span>}
                        </div>

                        {showInterestInfo && (
                            <div className="form-interest-alert">
                                <AlertTriangle size={16} />
                                <span>Interest Rate: {loanInterestRate}% </span>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Reason *</label>
                            <textarea
                                className={`form-control form-control--textarea ${errors.reason ? "error" : ""}`}
                                placeholder="Explain why you need this advance/loan..."
                                value={formData.reason}
                                onChange={handleChange("reason")}
                                rows="3"
                            />
                            {errors.reason && <span className="form-error">{errors.reason}</span>}
                        </div>

                        <div className="form-group">
                            <label>Repayment Option *</label>
                            <div className="radio-group">
                                {!isLoan && (
                                    <label className="radio-label">
                                        <input type="radio" value="ONE_TIME" checked={formData.repaymentOption === "ONE_TIME"} onChange={handleChange("repaymentOption")} />
                                        One Time Payment
                                    </label>
                                )}
                                <label className="radio-label">
                                    <input type="radio" value="MONTHLY_INSTALLMENTS" checked={formData.repaymentOption === "MONTHLY_INSTALLMENTS"} onChange={handleChange("repaymentOption")} />
                                    Monthly Installments
                                </label>
                            </div>
                            {errors.repaymentOption && <span className="form-error">{errors.repaymentOption}</span>}
                        </div>

                        {showTenure && (
                            <div className="form-group">
                                <label>Tenure (Months) *</label>
                                <input
                                    type="number"
                                    className={`form-control ${errors.tenure ? "error" : ""}`}
                                    placeholder="Number of months"
                                    value={formData.tenure}
                                    onChange={handleChange("tenure")}
                                    min="1"
                                />
                                {errors.tenure && <span className="form-error">{errors.tenure}</span>}
                                <span className="form-hint">Due after this many months. Manual repayment - not deducted from salary.</span>
                            </div>
                        )}

                        {showMonthlyInstallments && (
                            <div className="form-group">
                                <label>Monthly Installment Amount (₹) *</label>
                                <input
                                    type="number"
                                    className={`form-control ${errors.repaymentAmount ? "error" : ""}`}
                                    placeholder="How much you can pay each month"
                                    value={formData.repaymentAmount}
                                    onChange={handleChange("repaymentAmount")}
                                    min="0"
                                    step="0.01"
                                />
                                {errors.repaymentAmount && <span className="form-error">{errors.repaymentAmount}</span>}
                                <span className="form-hint">This amount is deducted from your salary each month. {formData.repaymentAmount > 0 && Number(formData.amount) > 0 && (
                                    <button type="button" className="view-breakup-btn-inline" onClick={() => { if (showBreakdown) { setShowBreakdown(false); } else { handleViewBreakup(); } }}>
                                        {showBreakdown ? "Hide Breakup" : "View Breakup"}
                                    </button>
                                )}</span>
                            </div>
                        )}

                        {showBreakdown && monthlyBreakdown.length > 0 && (
                            <div className="breakdown-preview">
                                <h4>{isOneTime ? "Due Preview (Manual Repayment - Not auto deducted from salary)" : "Monthly Breakdown Preview (Salary Deduction)"}</h4>
                                {isOneTime && <p className="form-hint" style={{ marginBottom: "8px", color: "#dc2626" }}>One-time payment is manual - you can repay anytime within the tenure. {isLoan ? "Total amount with interest is due in the due month." : "Full amount is due in the due month (no interest)."}</p>}
                                <table className="breakdown-table">
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
                                                <td className="amount-cell">{formatCurrency(item.amount)}</td>
                                                <td className="amount-cell">{formatCurrency(item.interestAmount)}</td>
                                                <td className="amount-cell">{formatCurrency((item.amount || 0) + (item.interestAmount || 0))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="breakdown-total">
                                    <strong>Total Payable: {formatCurrency(monthlyBreakdown.reduce((s, i) => s + i.amount + (i.interestAmount || 0), 0))}</strong>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Priority</label>
                            <select className="form-control" value={formData.priority} onChange={handleChange("priority")}>
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>

                        <div className="form-group checkbox-group">
                            <label className="checkbox-label">
                                <input type="checkbox" checked={formData.isEmergency} onChange={handleChange("isEmergency")} />
                                <span>Mark as Emergency Request</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="advance-modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={handleSubmit}>
                        <IndianRupee size={16} /> Submit Request
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ===========================
    PAYMENT MODAL
   =========================== */
function PaymentModal({ open, onClose, request, onSubmit }) {
    const [formData, setFormData] = useState({
        amount: "",
        paymentDate: new Date().toISOString().split("T")[0],
        paymentMethod: "SALARY_DEDUCTION",
        referenceNumber: "",
        remarks: "",
    });
    const [selectedEmiIndex, setSelectedEmiIndex] = useState(null);

    useEffect(() => {
        if (request) {
            // For monthly installments, we show upcoming EMIs to mark as paid
            // rather than a free amount input. Reset the selection on open.
            setSelectedEmiIndex(null);
            setFormData((prev) => ({
                ...prev,
                amount: "",
                paymentDate: new Date().toISOString().split("T")[0],
                paymentMethod: "SALARY_DEDUCTION",
                referenceNumber: "",
                remarks: "",
            }));
        }
    }, [request]);

    const isMonthly = request?.repaymentOption === "MONTHLY_INSTALLMENTS";
    const upcomingEmis = (request?.monthlyBreakdown || [])
        .map((emi, idx) => ({ ...emi, idx }))
        .filter((emi) => emi.status === "UPCOMING" || emi.status === "OVERDUE");

    const handleChange = (field) => (e) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const selectEmi = (idx) => {
        const emi = upcomingEmis.find((e) => e.idx === idx);
        if (emi) {
            const dueAmt = (emi.amount || 0) + (emi.interestAmount || 0);
            setSelectedEmiIndex(idx);
            setFormData((prev) => ({ ...prev, amount: dueAmt.toFixed(2) }));
        }
    };

    const handleSubmit = () => {
        if (isMonthly) {
            if (selectedEmiIndex === null) { alert("Please select an EMI to mark as paid"); return; }
            const selected = upcomingEmis.find((e) => e.idx === selectedEmiIndex);
            const amount = selected ? Number(((selected.amount || 0) + (selected.interestAmount || 0)).toFixed(2)) : 0;
            if (!amount || amount <= 0) { alert("Please select a valid EMI"); return; }
            onSubmit({
                ...formData,
                amount,
                emiIndex: selectedEmiIndex,
                paymentDate: formData.paymentDate,
                paymentMethod: formData.paymentMethod,
                referenceNumber: formData.referenceNumber || "",
                remarks: formData.remarks || "",
            });
            return;
        }

        const amount = Number(formData.amount);
        if (!amount || amount <= 0) { alert("Please enter a valid payment amount"); return; }
        if (request && amount > request.remainingAmount) {
            alert(`Amount cannot exceed remaining amount of ${formatCurrency(request.remainingAmount)}`);
            return;
        }
        onSubmit({
            ...formData, amount: Number(formData.amount), paymentDate: formData.paymentDate,
            paymentMethod: formData.paymentMethod, referenceNumber: formData.referenceNumber || "", remarks: formData.remarks || "",
        });
    };

    if (!open || !request) return null;

    return (
        <div className="advance-modal-overlay" onClick={onClose}>
            <div className="advance-modal payment-modal" onClick={(e) => e.stopPropagation()}>
                <div className="advance-modal-header">
                    <h3>Record Payment</h3>
                    <button className="advance-modal-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="advance-modal-body">
                    <div className="payment-request-info">
                        <div className="info-item">
                            <span className="info-label">Employee</span>
                            <span className="info-value">{request.employeeId?.name || "-"}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Type</span>
                            <span className="info-value">{getTypeLabel(request.requestType)}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Repayment</span>
                            <span className="info-value">{request.repaymentOption === "ONE_TIME" ? "One Time" : request.repaymentOption === "MONTHLY_INSTALLMENTS" ? `${request.totalInstallments} Months Installment` : "Custom"}</span>
                        </div>
                        <div className="info-item info-item-remaining">
                            <span className="info-label">Remaining Amount</span>
                            <span className="info-value highlight">{formatCurrency(request.remainingAmount)}</span>
                        </div>
                    </div>

                    <div className="advance-form">
                        {isMonthly ? (
                            <div className="form-group">
                                <label>Select Upcoming EMI to Mark as Paid *</label>
                                {upcomingEmis.length === 0 ? (
                                    <p className="form-hint">No upcoming EMIs to mark as paid.</p>
                                ) : (
                                    <div className="emi-list">
                                        {upcomingEmis.map((emi) => {
                                            const dueAmt = (emi.amount || 0) + (emi.interestAmount || 0);
                                            const active = selectedEmiIndex === emi.idx;
                                            return (
                                                <button
                                                    type="button"
                                                    key={emi.idx}
                                                    className={`emi-item ${active ? "selected" : ""}`}
                                                    onClick={() => selectEmi(emi.idx)}
                                                >
                                                    <span className="emi-month">{emi.month} {emi.year}</span>
                                                    <span className="emi-amount">{formatCurrency(dueAmt)}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {formData.amount ? (
                                    <span className="form-hint" style={{ display: "block", marginTop: "6px", fontWeight: 600, color: "#2563eb" }}>
                                        Marking this EMI as paid for {formatCurrency(formData.amount)}
                                    </span>
                                ) : null}
                            </div>
                        ) : (
                            <div className="form-group">
                                <label>Amount *</label>
                                <input type="number" className="form-control" placeholder="Enter payment amount" value={formData.amount} onChange={handleChange("amount")} min="0" step="0.01" />
                            </div>
                        )}
                        <div className="form-group">
                            <label>Payment Date *</label>
                            <input type="date" className="form-control" value={formData.paymentDate} onChange={handleChange("paymentDate")} max={new Date().toISOString().split("T")[0]} />
                        </div>
                        <div className="form-group">
                            <label>Payment Method *</label>
                            <select className="form-control" value={formData.paymentMethod} onChange={handleChange("paymentMethod")}>
                                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Reference Number</label>
                            <input type="text" className="form-control" placeholder="Enter reference number" value={formData.referenceNumber} onChange={handleChange("referenceNumber")} />
                        </div>
                        <div className="form-group">
                            <label>Remarks</label>
                            <textarea className="form-control form-control--textarea" placeholder="Add any remarks..." value={formData.remarks} onChange={handleChange("remarks")} rows="2" />
                        </div>
                    </div>
                </div>
                <div className="advance-modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={handleSubmit}><Banknote size={16} /> {isMonthly ? "Mark as Paid" : "Record Payment"}</button>
                </div>
            </div>
        </div>
    );
}


/* ===========================
    DETAIL MODAL
   =========================== */
function DetailModal({ open, onClose, request }) {
    if (!open || !request) return null;

    const paymentHistory = request.paymentHistory || [];
    const totalPaid = paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remainingAmount = (request.totalPayableAmount || request.amount || 0) - totalPaid;
    const isLoan = request.requestType === "LOAN";
    const interestAmount = isLoan ? (request.interestAmount || 0) : 0;
    const totalPayable = request.totalPayableAmount || (request.amount + interestAmount);

    const getMethodLabel = (method) => {
        const labels = { SALARY_DEDUCTION: "Salary Deduction", CASH: "Cash", BANK_TRANSFER: "Bank Transfer", OTHER: "Other" };
        return labels[method] || method;
    };

    return (
        <div className="advance-modal-overlay" onClick={onClose}>
            <div className="advance-modal detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="advance-modal-header">
                    <h3>Request Details</h3>
                    <button className="advance-modal-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="advance-modal-body">
                    <div className="detail-summary-grid">
                        <div className="detail-summary-card">
                            <div className="detail-summary-label">Total Amount</div>
                            <div className="detail-summary-value">{formatCurrency(request.amount)}</div>
                        </div>
                        {isLoan && <div className="detail-summary-card">
                            <div className="detail-summary-label">Interest</div>
                            <div className="detail-summary-value">{formatCurrency(interestAmount)}</div>
                        </div>}
                        <div className="detail-summary-card">
                            <div className="detail-summary-label">Total Payable</div>
                            <div className="detail-summary-value highlight">{formatCurrency(totalPayable)}</div>
                        </div>
                        <div className="detail-summary-card">
                            <div className="detail-summary-label">Total Paid</div>
                            <div className="detail-summary-value paid">{formatCurrency(totalPaid)}</div>
                        </div>
                        <div className="detail-summary-card">
                            <div className="detail-summary-label">Remaining</div>
                            <div className="detail-summary-value remaining">{formatCurrency(Math.max(0, remainingAmount))}</div>
                        </div>
                        <div className="detail-summary-card">
                            <div className="detail-summary-label">Status</div>
                            <div className="detail-summary-value">
                                <span className={STATUS_CLASS[request.status] || "advance-status"}>{STATUS_LABELS[request.status] || request.status}</span>
                            </div>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h4>Request Information</h4>
                        <div className="detail-info-grid">
                            <div className="detail-info-row">
                                <span className="detail-info-label">Employee</span>
                                <span className="detail-info-value">{request.employeeId?.name || "-"}</span>
                            </div>
                            <div className="detail-info-row">
                                <span className="detail-info-label">Employee Code</span>
                                <span className="detail-info-value">{request.employeeId?.employeeCode || "-"}</span>
                            </div>
                            <div className="detail-info-row">
                                <span className="detail-info-label">Type</span>
                                <span className="detail-info-value">{getTypeLabel(request.requestType)}</span>
                            </div>
                            <div className="detail-info-row">
                                <span className="detail-info-label">Repayment Option</span>
                                <span className="detail-info-value">
                                    {request.repaymentOption === "ONE_TIME" ? `One Time (${request.tenure || request.totalInstallments} months)` :
                                        request.repaymentOption === "MONTHLY_INSTALLMENTS" ? `${request.totalInstallments} Months` : "Custom Schedule"}
                                </span>
                            </div>
                            <div className="detail-info-row">
                                <span className="detail-info-label">Interest Rate</span>
                                <span className="detail-info-value">{isLoan && request.interestRate > 0 ? `${request.interestRate}%` : "N/A"}</span>
                            </div>
                            <div className="detail-info-row">
                                <span className="detail-info-label">Next Deduction Month</span>
                                <span className="detail-info-value">{formatDeductionMonth(request.deductionMonth)}</span>
                            </div>
                            <div className="detail-info-row">
                                <span className="detail-info-label">Reason</span>
                                <span className="detail-info-value">{request.reason || "-"}</span>
                            </div>
                            <div className="detail-info-row">
                                <span className="detail-info-label">Priority</span>
                                <span className="detail-info-value">
                                    <span className={getPriorityBadge(request.priority, request.status)}>{request.priority}</span>
                                </span>
                            </div>
                            <div className="detail-info-row">
                                <span className="detail-info-label">Created</span>
                                <span className="detail-info-value">{formatDate(request.createdAt)}</span>
                            </div>
                            {request.approvedAt && (
                                <div className="detail-info-row">
                                    <span className="detail-info-label">Approved</span>
                                    <span className="detail-info-value">{formatDate(request.approvedAt)} by {request.approvedBy?.name || "-"}</span>
                                </div>
                            )}
                            {request.rejectedAt && (
                                <div className="detail-info-row">
                                    <span className="detail-info-label">Rejected</span>
                                    <span className="detail-info-value">{formatDate(request.rejectedAt)} by {request.rejectedBy?.name || "-"} - {request.rejectionReason || "No reason"}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Salary Earnings Preview */}
                    {request.status === "APPROVED" && request.salaryEarnings && (
                        <div className="detail-section">
                            <h4>Salary Earnings Entry (Next Month)</h4>
                            <div className="detail-info-grid">
                                <div className="detail-info-row">
                                    <span className="detail-info-label">Entry Label</span>
                                    <span className="detail-info-value">{request.salaryEarnings?.label || "-"}</span>
                                </div>
                                <div className="detail-info-row">
                                    <span className="detail-info-label">Amount</span>
                                    <span className="detail-info-value">{formatCurrency(request.salaryEarnings?.amount || 0)}</span>
                                </div>
                                <div className="detail-info-row">
                                    <span className="detail-info-label">Status</span>
                                    <span className="detail-info-value">{request.salaryEarnings?.isAdded ? "✅ Added to Payroll" : "⏳ Pending Addition"}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment History */}
                    <div className="detail-section">
                        <h4>Payment History</h4>
                        {paymentHistory.length === 0 ? <p className="detail-empty">No payments recorded yet</p> : (
                            <div className="detail-payment-table-wrapper">
                                <table className="detail-payment-table">
                                    <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Recorded By</th><th>Remarks</th></tr></thead>
                                    <tbody>
                                        {paymentHistory.map((payment, index) => (
                                            <tr key={index}>
                                                <td>{formatDate(payment.paymentDate)}</td>
                                                <td className="amount-cell">{formatCurrency(payment.amount)}</td>
                                                <td><span className="method-badge">{getMethodLabel(payment.paymentMethod)}</span></td>
                                                <td>{payment.referenceNumber || "-"}</td>
                                                <td>{payment.recordedBy?.name || payment.recordedBy?.employeeCode || "-"}</td>
                                                <td>{payment.remarks || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Monthly Breakdown for ONE_TIME */}
                    {request.monthlyBreakdown && request.monthlyBreakdown.length > 0 && (
                        <div className="detail-section">
                            <h4>Repayment Schedule</h4>
                            <div className="detail-payment-table-wrapper">
                                <table className="detail-payment-table">
                                    <thead><tr><th>Month</th><th>Amount</th><th>Interest</th><th>Status</th><th>Paid Date</th></tr></thead>
                                    <tbody>
                                        {request.monthlyBreakdown.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.month} {item.year}</td>
                                                <td className="amount-cell">{formatCurrency(item.amount)}</td>
                                                <td className="amount-cell">{formatCurrency(item.interestAmount || 0)}</td>
                                                <td><span className={`schedule-status ${item.status?.toLowerCase()}`}>{item.status || "PENDING"}</span></td>
                                                <td>{item.paidDate ? formatDate(item.paidDate) : "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {request.customRepaymentSchedule && request.customRepaymentSchedule.length > 0 && (
                        <div className="detail-section">
                            <h4>Repayment Schedule</h4>
                            <div className="detail-payment-table-wrapper">
                                <table className="detail-payment-table">
                                    <thead><tr><th>Due Date</th><th>Amount</th><th>Status</th><th>Paid Date</th></tr></thead>
                                    <tbody>
                                        {request.customRepaymentSchedule.map((item, index) => (
                                            <tr key={index}>
                                                <td>{formatDate(item.date)}</td>
                                                <td className="amount-cell">{formatCurrency(item.amount)}</td>
                                                <td><span className={`schedule-status ${item.status?.toLowerCase()}`}>{item.status || "PENDING"}</span></td>
                                                <td>{item.paidDate ? formatDate(item.paidDate) : "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {request.comments && request.comments.length > 0 && (
                        <div className="detail-section">
                            <h4>Comments</h4>
                            <div className="detail-comments">
                                {request.comments.map((comment, index) => (
                                    <div key={index} className="detail-comment">
                                        <div className="detail-comment-header">
                                            <span className="detail-comment-author">{comment.commentedBy?.name || comment.commentedBy?.employeeCode || "Unknown"}</span>
                                            <span className="detail-comment-date">{formatDate(comment.commentedAt)}</span>
                                        </div>
                                        <div className="detail-comment-text">{comment.comment}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Approved Repayment Plan (for employee to see what admin approved) */}
                    {request.status !== "PENDING" && request.repaymentOption === "MONTHLY_INSTALLMENTS" && request.approvedRepayment && request.approvedRepayment.monthlyAmount > 0 && (
                        <div className="detail-section">
                            <h4>Approved Repayment Plan</h4>
                            <div className="detail-info-grid">
                                <div className="detail-info-row">
                                    <span className="detail-info-label">Monthly Deduction</span>
                                    <span className="detail-info-value">{formatCurrency(request.approvedRepayment.monthlyAmount)} / month</span>
                                </div>
                                <div className="detail-info-row">
                                    <span className="detail-info-label">Number of Months</span>
                                    <span className="detail-info-value">{request.approvedRepayment.totalInstallments} months</span>
                                </div>
                                {request.approvedRepayment.updatedAt && request.approvedRepayment.updatedAt !== request.approvedAt && (
                                    <div className="detail-info-row">
                                        <span className="detail-info-label">Last Updated By</span>
                                        <span className="detail-info-value">{request.approvedRepayment.updatedBy?.name || "Admin"}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Modification Log — shows admin changes to repayment so employee sees what changed */}
                    {request.modificationLog && request.modificationLog.length > 0 && (
                        <div className="detail-section">
                            <h4>Repayment Changes</h4>
                            <div className="detail-comments">
                                {request.modificationLog.map((log, idx) => (
                                    <div key={idx} className="detail-comment" style={{ borderLeft: "3px solid #f59e0b", paddingLeft: "12px" }}>
                                        <div className="detail-comment-header">
                                            <span className="detail-comment-author">{log.changedBy?.name || "Admin"}</span>
                                            <span className="detail-comment-date">{formatDate(log.changedAt)}</span>
                                        </div>
                                        <div className="detail-comment-text">{log.note}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="advance-modal-footer">
                    <button className="btn-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

/* ===========================
    INNER COMPONENT
   =========================== */
function AdvanceLoanInner() {
    const toast = useToast();
    const user = getStoredUser();
    const canApprove = canApproveAdvanceLoan(user?.role);
    const canCreate = user?.role !== "Admin";

    const [dashboard, setDashboard] = useState(null);
    const [requests, setRequests] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [, setError] = useState("");
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailRequest, setDetailRequest] = useState(null);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterType, setFilterType] = useState("");
    const [loanConfig, setLoanConfig] = useState(null);
    const [payrollWarning, setPayrollWarning] = useState("");
    const [formApiError, setFormApiError] = useState("");
    const [openMenuId, setOpenMenuId] = useState(null);

    // Close the row action dropdown when clicking anywhere outside it.
    useEffect(() => {
        const closeMenu = () => setOpenMenuId(null);
        document.addEventListener("click", closeMenu);
        return () => document.removeEventListener("click", closeMenu);
    }, []);

    const [modal, setModal] = useState({
        open: false, title: "", message: "", confirmLabel: "Confirm", variant: "danger",
        onConfirm: null, withInput: false, inputValue: "", inputLabel: "", inputPlaceholder: "",
    });
    const modalInputRef = useRef("");

    const closeModal = () => setModal((m) => ({ ...m, open: false, inputValue: "" }));
    const openModal = (config) => {
        modalInputRef.current = "";
        setModal({ open: true, inputValue: "", withInput: false, ...config });
    };

    const summary = dashboard?.statistics || {};

    const teamMembers = useMemo(() => {
        if (!user?.employeeId) return employees;
        return employees.filter((emp) => String(emp._id) !== String(user.employeeId));
    }, [employees, user?.employeeId]);

    const loadLoanConfig = useCallback(async () => {
        try {
            const res = await getLoanConfig();
            if (res.config) setLoanConfig(res.config);
        } catch { }
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");
        setPayrollWarning("");
        try {
            let dashRes = null;
            let reqRes = null;

            // Fix: Employee should call getMyRequests (self only), Manager/Admin/HR can call getAllRequests + getStatistics
            // canViewAllAdvanceLoan = Admin|HR|Manager => team/org view; Employee => own view
            const canViewAll = canViewAllAdvanceLoan(user?.role);

            if (canViewAll) {
                try {
                    [dashRes, reqRes] = await Promise.all([getStatistics(), getAllRequests()]);
                } catch (allErr) {
                    // If Manager/HR fails due to permission, fallback to my requests for safety
                    if (allErr.response?.status === 403) {
                        reqRes = await getMyRequests();
                        const myReqs = reqRes?.requests || [];
                        // Total Requested = principal amount (what user applied for, no interest)
                        const totalAmount = myReqs.reduce((sum, r) => sum + (r.amount || 0), 0);
                        // Approved principal = sum of principal for approved/partially-paid requests
                        const totalApprovedPrincipal = myReqs.filter(r => ["APPROVED", "PARTIALLY_PAID"].includes(r.status)).reduce((sum, r) => sum + (r.amount || 0), 0);
                        // Remaining to Pay = sum of remainingAmount for active loans (includes interest - for employee view)
                        const totalRemainingAmount = myReqs.filter(r => ["APPROVED", "PARTIALLY_PAID"].includes(r.status)).reduce((sum, r) => sum + (r.remainingAmount || 0), 0);
                        // Remaining principal only (without interest - for admin/manager view)
                        const totalRemainingPrincipal = myReqs.filter(r => ["APPROVED", "PARTIALLY_PAID"].includes(r.status)).reduce((sum, r) => sum + Math.max(0, (r.amount || 0) - (r.totalPaid || 0)), 0);
                        const totalPaid = myReqs.reduce((sum, r) => sum + (r.totalPaid || 0), 0);
                        const totalRequests = myReqs.length;
                        const pendingRequests = myReqs.filter(r => r.status === "PENDING").length;
                        const approvedRequests = myReqs.filter(r => ["APPROVED", "PARTIALLY_PAID"].includes(r.status)).length;
                        const rejectedRequests = myReqs.filter(r => r.status === "REJECTED").length;
                        const cancelledRequests = myReqs.filter(r => r.status === "CANCELLED").length;
                        const fullyPaidRequests = myReqs.filter(r => r.status === "FULLY_PAID").length;
                        const pendingApprovalAmount = myReqs.filter(r => r.status === "PENDING").reduce((sum, r) => sum + (r.amount || 0), 0);
                        const rejectedAmount = myReqs.filter(r => r.status === "REJECTED").reduce((sum, r) => sum + (r.amount || 0), 0);
                        const cancelledAmount = myReqs.filter(r => r.status === "CANCELLED").reduce((sum, r) => sum + (r.amount || 0), 0);
                        const fullyPaidPrincipal = myReqs.filter(r => r.status === "FULLY_PAID").reduce((sum, r) => sum + (r.amount || 0), 0);
                        const recoveredTotal = myReqs.filter(r => ["APPROVED", "PARTIALLY_PAID", "FULLY_PAID"].includes(r.status)).reduce((sum, r) => sum + (r.totalPaid || 0), 0);
                        const givenTotal = myReqs.filter(r => ["APPROVED", "PARTIALLY_PAID", "FULLY_PAID"].includes(r.status)).reduce((sum, r) => sum + (r.amount || 0), 0);
                        dashRes = {
                            statistics: {
                                totalRequests, pendingRequests, approvedRequests, rejectedRequests,
                                cancelledRequests, fullyPaidRequests,
                                totalAmount, totalApprovedPrincipal, totalRemainingAmount, totalRemainingPrincipal, totalPaid,
                                pendingApprovalAmount, rejectedAmount, cancelledAmount, fullyPaidPrincipal,
                                recoveredTotal, givenTotal, outstandingTotal: Math.max(0, givenTotal - recoveredTotal),
                            },
                            recentRequests: myReqs.slice(0, 5),
                        };
                    } else {
                        throw allErr;
                    }
                }
            } else {
                reqRes = await getMyRequests();
                const myReqs = reqRes?.requests || [];
                // Total Requested = principal amount (what user applied for, no interest)
                const totalAmount = myReqs.reduce((sum, r) => sum + (r.amount || 0), 0);
                // Approved principal = sum of principal for approved/partially-paid requests
                const totalApprovedPrincipal = myReqs.filter(r => ["APPROVED", "PARTIALLY_PAID"].includes(r.status)).reduce((sum, r) => sum + (r.amount || 0), 0);
                // Remaining to Pay = sum of remainingAmount for active loans (includes interest - for employee view)
                const totalRemainingAmount = myReqs.filter(r => ["APPROVED", "PARTIALLY_PAID"].includes(r.status)).reduce((sum, r) => sum + (r.remainingAmount || 0), 0);
                // Remaining principal only (without interest - for admin/manager view)
                const totalRemainingPrincipal = myReqs.filter(r => ["APPROVED", "PARTIALLY_PAID"].includes(r.status)).reduce((sum, r) => sum + Math.max(0, (r.amount || 0) - (r.totalPaid || 0)), 0);
                const totalPaid = myReqs.reduce((sum, r) => sum + (r.totalPaid || 0), 0);
                const totalRequests = myReqs.length;
                const pendingRequests = myReqs.filter(r => r.status === "PENDING").length;
                const approvedRequests = myReqs.filter(r => ["APPROVED", "PARTIALLY_PAID"].includes(r.status)).length;
                const rejectedRequests = myReqs.filter(r => r.status === "REJECTED").length;
                const cancelledRequests = myReqs.filter(r => r.status === "CANCELLED").length;
                const fullyPaidRequests = myReqs.filter(r => r.status === "FULLY_PAID").length;
                const pendingApprovalAmount = myReqs.filter(r => r.status === "PENDING").reduce((sum, r) => sum + (r.amount || 0), 0);
                const rejectedAmount = myReqs.filter(r => r.status === "REJECTED").reduce((sum, r) => sum + (r.amount || 0), 0);
                const cancelledAmount = myReqs.filter(r => r.status === "CANCELLED").reduce((sum, r) => sum + (r.amount || 0), 0);
                const fullyPaidPrincipal = myReqs.filter(r => r.status === "FULLY_PAID").reduce((sum, r) => sum + (r.amount || 0), 0);
                const recoveredTotal = myReqs.filter(r => ["APPROVED", "PARTIALLY_PAID", "FULLY_PAID"].includes(r.status)).reduce((sum, r) => sum + (r.totalPaid || 0), 0);
                const givenTotal = myReqs.filter(r => ["APPROVED", "PARTIALLY_PAID", "FULLY_PAID"].includes(r.status)).reduce((sum, r) => sum + (r.amount || 0), 0);
                dashRes = {
                    statistics: {
                        totalRequests, pendingRequests, approvedRequests, rejectedRequests,
                        cancelledRequests, fullyPaidRequests,
                        totalAmount, totalApprovedPrincipal, totalRemainingAmount, totalRemainingPrincipal, totalPaid,
                        pendingApprovalAmount, rejectedAmount, cancelledAmount, fullyPaidPrincipal,
                        recoveredTotal, givenTotal, outstandingTotal: Math.max(0, givenTotal - recoveredTotal),
                    },
                    recentRequests: myReqs.slice(0, 5),
                };
            }

            setDashboard(dashRes);
            setRequests(reqRes?.requests || []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [user?.role]);

    useEffect(() => {
        loadData();
        loadLoanConfig();
    }, [loadData, loadLoanConfig]);

    // Refetch latest loan config whenever request form is opened - ensures dynamic admin value (e.g., 25) is shown
    useEffect(() => {
        if (showRequestForm) loadLoanConfig();
    }, [showRequestForm, loadLoanConfig]);

    useEffect(() => {
        if (!canApprove) return;
        const fetchEmployees = async () => {
            try {
                const res = await getEmployees();
                setEmployees(res.data?.employees || []);
            } catch { }
        };
        fetchEmployees();
    }, [user?.role, canApprove]);

    const handleCreateRequest = async (formData) => {
        try {
            await createAdvanceLoanRequest(formData);
            toast.success(`${formData.requestType} request submitted successfully`);
            setError("");
            setPayrollWarning("");
            setFormApiError("");
            setShowRequestForm(false);
            loadData();
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to submit request";
            // Always show API error inside modal + top + toast
            if (msg.includes("Payroll profile")) {
                setPayrollWarning(msg);
                setFormApiError(msg);
            } else {
                setError(msg);
                setFormApiError(msg);
                toast.error(msg);
            }
        }
    };

    const handleCancelRequest = (id) => {
        openModal({
            title: "Cancel Request", message: "Are you sure you want to cancel this request?",
            confirmLabel: "Cancel Request", variant: "danger",
            onConfirm: async () => {
                setActionLoading(true);
                try { await cancelRequest(id); setError(""); toast.success("Request cancelled successfully"); loadData(); }
                catch (err) { const msg = err.response?.data?.message || "Cancel failed"; setError(msg); toast.error(msg); }
                finally { setActionLoading(false); closeModal(); }
            },
        });
    };

    const handleApprove = (request) => {
        openModal({
            title: "Approve Request",
            message: (
                <>
                    <p className="modal-message-text">Are you sure you want to approve this request?</p>
                    <RequestSummaryBlock request={request} showEmployee />
                </>
            ),
            confirmLabel: "Approve", variant: "success", withInput: true, inputValue: "",
            inputLabel: "Comments (optional)", inputPlaceholder: "Add any comments...",
            onConfirm: async () => {
                setActionLoading(true);
                try { await approveRequest(request._id, modalInputRef.current); setError(""); toast.success("Request approved successfully"); loadData(); }
                catch (err) { const msg = err.response?.data?.message || "Approve failed"; setError(msg); toast.error(msg); }
                finally { setActionLoading(false); closeModal(); }
            },
        });
    };

    const handleReject = (request) => {
        openModal({
            title: "Reject Request",
            message: (
                <>
                    <p className="modal-message-text">You are about to reject this request. Please provide a reason.</p>
                    <RequestSummaryBlock request={request} showEmployee />
                </>
            ),
            confirmLabel: "Reject", variant: "danger", withInput: true, inputValue: "",
            inputLabel: "Rejection Reason *", inputPlaceholder: "Please provide a reason for rejection...",
            onConfirm: async () => {
                setActionLoading(true);
                try { await rejectRequest(request._id, { rejectionReason: modalInputRef.current }); setError(""); toast.warning("Request rejected"); loadData(); }
                catch (err) { const msg = err.response?.data?.message || "Reject failed"; setError(msg); toast.error(msg); }
                finally { setActionLoading(false); closeModal(); }
            },
        });
    };

    const handleRecordPayment = async (paymentData) => {
        if (!selectedRequest) return;
        try {
            await recordPayment(selectedRequest._id, paymentData);
            setError("");
            toast.success("Payment recorded successfully");
            setShowPaymentModal(false);
            setSelectedRequest(null);
            loadData();
        } catch (err) { const msg = err.response?.data?.message || "Failed to record payment"; setError(msg); toast.error(msg); }
    };

    const handleViewDetails = async (id) => {
        try {
            setActionLoading(true);
            const response = await getRequestDetails(id);
            setDetailRequest(response.data?.request || response.request);
            setShowDetailModal(true);
            setError("");
        } catch (err) { const msg = err.response?.data?.message || "Failed to load details"; setError(msg); toast.error(msg); }
        finally { setActionLoading(false); }
    };

    const matchesUser = useCallback((item) => {
        const empId = item.employeeId?._id || item.employeeId;
        if (user?.employeeId && empId && String(empId) === String(user.employeeId)) return true;
        const empName = item.employeeId?.name?.toLowerCase?.();
        return empName && empName === user?.name?.toLowerCase?.();
    }, [user?.employeeId, user?.name]);

    const filteredRequests = useMemo(() => {
        let filtered = requests;
        if (filterStatus) filtered = filtered.filter((r) => r.status === filterStatus);
        if (filterType) filtered = filtered.filter((r) => r.requestType === filterType);
        return filtered;
    }, [requests, filterStatus, filterType]);

    const myRequests = useMemo(() => filteredRequests.filter(matchesUser), [filteredRequests, matchesUser]);
    const pendingRequests = useMemo(() => filteredRequests.filter((r) => r.status === "PENDING"), [filteredRequests]);
    const approvedRequests = useMemo(() => filteredRequests.filter((r) => r.status === "APPROVED" || r.status === "PARTIALLY_PAID"), [filteredRequests]);

    const renderRequestTable = ({ title, items, showEmployee = false, showActions = false, actionMode = "owner" }) => (
        <section className="advance-card">
            <h3>{title}</h3>
            <div style={{ overflow: "visible" }}>
                <table className="advance-table">
                    <thead><tr>
                        {showEmployee ? <th>Employee</th> : null}
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Repayment</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Priority</th>
                        {showActions ? <th>Actions</th> : null}
                    </tr></thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan={showEmployee ? (showActions ? 9 : 8) : (showActions ? 8 : 7)} className="advance-empty">No requests found</td></tr>
                        ) : null}
                        {items.map((req) => {
                            const empName = req.employeeId?.name || null;
                            const isOwner = String(req.employeeId?._id || req.employeeId) === String(user?.employeeId);
                            const canCancel = req.status === "PENDING" && isOwner && canCreate;
                            const canApproveAction = req.status === "PENDING" && !isOwner && canApprove;
                            const canRecordPayment = (req.status === "APPROVED" || req.status === "PARTIALLY_PAID") && !isOwner && canApprove && req.remainingAmount > 0;
                            // Admin pending should show View + Approve + Reject (user request detail)
                            const canView = ["PENDING", "APPROVED", "PARTIALLY_PAID", "FULLY_PAID", "REJECTED", "CANCELLED"].includes(req.status);

                            return (
                                <tr key={req._id}>
                                    {showEmployee ? <td>{empName || "-"}</td> : null}
                                    <td><span className="advance-type-badge">{getTypeLabel(req.requestType)}</span></td>
                                    <td className="amount-cell">{formatCurrency(req.amount)}</td>
                                    <td>{getRepaymentLabel(req)}</td>
                                    <td>{formatDate(req.createdAt)}</td>
                                    <td>
                                        <span className={STATUS_CLASS[req.status] || "advance-status"}>{STATUS_LABELS[req.status] || req.status}</span>
                                        {req.status === "REJECTED" && (req.rejectionReason || req.reasonForRejection) && (
                                            <span className="rejection-reason" title={(req.rejectionReason || req.reasonForRejection)}>Reason: {req.rejectionReason || req.reasonForRejection}</span>
                                        )}
                                    </td>
                                    <td><span className={getPriorityBadge(req.priority, req.status)}>{req.priority}</span></td>
                                    {showActions ? (
                                        <td>
                                            <div className="advance-actions-cell">
                                                {req.status === "PENDING" && isOwner && canCreate && (
                                                    <span className="awaiting-text">Awaiting approval</span>
                                                )}
                                                {(() => {
                                                    const items = [];
                                                    if (canCancel) {
                                                        items.push({ key: "cancel", label: "Cancel", icon: <Ban size={14} />, cls: "menu-cancel", onClick: () => handleCancelRequest(req._id) });
                                                    }
                                                    if (canApproveAction && (actionMode === "approve" || actionMode === "full")) {
                                                        items.push({ key: "approve", label: "Approve", icon: <CheckCircle2 size={14} />, cls: "menu-approve", onClick: () => handleApprove(req) });
                                                        items.push({ key: "reject", label: "Reject", icon: <XCircle size={14} />, cls: "menu-reject", onClick: () => handleReject(req) });
                                                    }
                                                    if (canRecordPayment && actionMode === "payment") {
                                                        items.push({ key: "payment", label: "Record Payment", icon: <Banknote size={14} />, cls: "", onClick: () => { setSelectedRequest(req); setShowPaymentModal(true); } });
                                                    }
                                                    if (canView) {
                                                        items.push({ key: "view", label: "View", icon: <Eye size={14} />, cls: "menu-view", onClick: () => handleViewDetails(req._id) });
                                                    }
                                                    return (
                                                        <div className={`advance-menu-wrap${openMenuId === req._id ? " open" : ""}`} onClick={(e) => e.stopPropagation()}>
                                                            <button className="advance-menu-trigger" onClick={(e) => { e.stopPropagation(); setOpenMenuId((cur) => (cur === req._id ? null : req._id)); }} title="Actions" aria-label="Actions">
                                                                <MoreVertical size={17} />
                                                            </button>
                                                            {openMenuId === req._id && items.length > 0 && (
                                                                <div className="advance-dropdown">
                                                                    {items.map((item) => (
                                                                        <button key={item.key} className={`advance-dropdown-item ${item.cls}`} onClick={() => { setOpenMenuId(null); item.onClick(); }}>
                                                                            {item.icon}
                                                                            <span>{item.label}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                    ) : null}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );

    const renderEmployeeView = () => (
        <>
            <div className="advance-page-header">
                <div className="advance-header-left">
                    <h2 className="advance-page-title">My Advances & Loans</h2>
                    <p className="advance-page-subtitle">Request advances or loans and track your repayments</p>
                </div>
                {canCreate && <button className="btn-primary" onClick={() => setShowRequestForm(true)}><IndianRupee size={16} />New Request</button>}
            </div>
            {payrollWarning && (
                <div className="advance-payroll-warning">
                    <AlertTriangle size={20} />
                    <span>{payrollWarning}</span>
                </div>
            )}
            <AdvanceLoanSummaryCards summary={summary} labels={{ total: "My Total Requested", approved: "My Approved", remaining: "My Remaining", paid: "My Paid" }} />
            {renderRequestTable({ title: "My Recent Requests", items: myRequests.slice(0, 10), showActions: true, actionMode: "owner" })}
        </>
    );

    const renderManagerView = () => (
        <>
            <div className="advance-page-header">
                <div className="advance-header-left">
                    <h2 className="advance-page-title">Team Advances & Loans</h2>
                    <p className="advance-page-subtitle">Manage your team's advance and loan requests</p>
                </div>
                {canCreate && <button className="btn-primary" onClick={() => setShowRequestForm(true)}><IndianRupee size={16} />New Request</button>}
            </div>
            {teamMembers.length > 0 && (
                <div className="advance-role-banner manager"><Users size={18} /><span>Managing {teamMembers.length} team member{teamMembers.length === 1 ? "" : "s"}</span></div>
            )}
            <AdminSummaryTiles summary={summary} />
            <div className="advance-layout-grid">
                {renderRequestTable({ title: "Pending Approvals", items: pendingRequests, showEmployee: true, showActions: true, actionMode: "approve" })}
                {renderRequestTable({ title: "Active Requests", items: approvedRequests, showEmployee: true, showActions: true, actionMode: "payment" })}
            </div>
            {renderRequestTable({ title: "All Team Requests", items: requests, showEmployee: true })}
        </>
    );

    const renderAdminView = () => (
        <>
            <div className="advance-page-header">
                <div className="advance-header-left">
                    <h2 className="advance-page-title">Advance & Loan Management</h2>
                    <p className="advance-page-subtitle">Manage all advance and loan requests across the organization</p>
                </div>
                <div className="advance-header-actions">
                    <button className="btn-secondary" onClick={loadData}><RefreshCw size={16} />Refresh</button>
                    {canCreate && <button className="btn-primary" onClick={() => setShowRequestForm(true)}><IndianRupee size={16} />New Request</button>}
                </div>
            </div>
            <AdminSummaryTiles summary={summary} />
            <div className="advance-stats-grid">
                <div className="stat-card"><div className="stat-item"><span className="stat-label">Total Requests</span><span className="stat-value">{summary.totalRequests || 0}</span></div></div>
                <div className="stat-card"><div className="stat-item"><span className="stat-label">Pending Approvals</span><span className="stat-value pending">{summary.pendingRequests || 0}</span></div></div>
                <div className="stat-card"><div className="stat-item"><span className="stat-label">Active</span><span className="stat-value approved">{summary.approvedRequests || 0}</span></div></div>
                <div className="stat-card"><div className="stat-item"><span className="stat-label">Cleared</span><span className="stat-value">{summary.fullyPaidRequests || 0}</span></div></div>
                <div className="stat-card"><div className="stat-item"><span className="stat-label">Rejected</span><span className="stat-value rejected">{summary.rejectedRequests || 0}</span></div></div>
                <div className="stat-card"><div className="stat-item"><span className="stat-label">Cancelled</span><span className="stat-value">{summary.cancelledRequests || 0}</span></div></div>
            </div>
            <div className="advance-filter-bar">
                <div className="filter-group"><label>Status</label><select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>{Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></div>
                <div className="filter-group"><label>Type</label><select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="">All Types</option><option value="ADVANCE">Advance</option><option value="LOAN">Loan</option>
                </select></div>
            </div>
            <div className="advance-layout-grid">
                {renderRequestTable({ title: "Pending Approvals", items: pendingRequests, showEmployee: true, showActions: true, actionMode: "full" })}
                {renderRequestTable({ title: "Active Requests", items: approvedRequests, showEmployee: true, showActions: true, actionMode: "payment" })}
            </div>
            {renderRequestTable({ title: "All Requests", items: filteredRequests, showEmployee: true })}
        </>
    );

    const [activeTab, setActiveTab] = useState(() => {
        try {
            const saved = localStorage.getItem("advance-loan-active-tab");
            return saved || "requests";
        } catch {
            return "requests";
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem("advance-loan-active-tab", activeTab);
        } catch { }
    }, [activeTab]);

    const isAdminOrHR = user?.role === "Admin" || user?.role === "HR";

    const roleViews = {
        Organization: renderAdminView, HR: renderAdminView, Admin: renderAdminView,
        Manager: renderManagerView, Employee: renderEmployeeView,
    };

    const renderTabs = () => {
        if (!isAdminOrHR) return null;
        return (
            <div className="advance-tabs">
                <button
                    className={`advance-tab ${activeTab === "requests" ? "active" : ""}`}
                    onClick={() => setActiveTab("requests")}
                >
                    <Clock3 size={16} /> Requests
                </button>
                <button
                    className={`advance-tab ${activeTab === "config" ? "active" : ""}`}
                    onClick={() => setActiveTab("config")}
                >
                    <Settings size={16} /> Configuration
                </button>
            </div>
        );
    };

    return (
        <MainLayout>
            <div className="advance-page">
                {renderTabs()}
                {/* {error ? <p className="advance-error">{error}</p> : null} */}
                {loading && !dashboard ? <p className="advance-empty">Loading data...</p> : (
                    activeTab === "config" ? (
                        <LoanConfiguration initialConfig={loanConfig} onConfigUpdate={(cfg) => setLoanConfig(cfg)} />
                    ) : (
                        roleViews[user?.role]?.() || roleViews.Employee()
                    )
                )}
                {activeTab === "requests" && (
                    <>
                        <RequestFormModal open={showRequestForm} onClose={() => { setShowRequestForm(false); setFormApiError(""); }} onSubmit={handleCreateRequest} employees={employees} canApprove={canApprove} canCreate={canCreate} loanConfig={loanConfig} apiError={formApiError} />
                        <PaymentModal open={showPaymentModal} onClose={() => { setShowPaymentModal(false); setSelectedRequest(null); }} request={selectedRequest} onSubmit={handleRecordPayment} />
                        <DetailModal open={showDetailModal} onClose={() => setShowDetailModal(false)} request={detailRequest} />
                        <ConfirmModal open={modal.open} title={modal.title} message={modal.message} confirmLabel={modal.confirmLabel} variant={modal.variant} loading={actionLoading} onConfirm={modal.onConfirm} onCancel={closeModal} inputLabel={modal.inputLabel} inputValue={modal.inputValue} onInputChange={(val) => { modalInputRef.current = val; setModal((m) => ({ ...m, inputValue: val })); }} inputPlaceholder={modal.inputPlaceholder} />
                    </>
                )}
            </div>
        </MainLayout>
    );
}

function AdvanceLoan() {
    return (
        <ToastProvider><AdvanceLoanInner /></ToastProvider>
    );
}

export default AdvanceLoan;