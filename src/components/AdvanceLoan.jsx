import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
    IndianRupee,
    Clock3,
    CheckCircle2,
    Banknote,
    Check,
    X,
    Users,
    RefreshCw,
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
} from "../services/advanceLoanService";
import { canManageEmployees } from "../utils/roles";
import { getEmployees } from "../services/employeeService";
import {
    getStoredUser,
    canApproveAdvanceLoan,
} from "../utils/roles";
import "./AdvanceLoanRequest.css";
import Card from "../components/Card";

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

const getPriorityBadge = (priority, status) => {
    const classes = {
        LOW: "priority-low",
        MEDIUM: "priority-medium",
        HIGH: "priority-high",
        URGENT: status === "PENDING" ? "priority-urgent" : "priority-high",
    };
    return `priority-badge ${classes[priority] || "priority-medium"}`;
};

/* ===========================
   SUMMARY CARDS
=========================== */
function AdvanceLoanSummaryCards({ summary, labels = {} }) {
    const cards = [
        {
            key: "total",
            icon: IndianRupee,
            iconClass: "blue",
            value: formatCurrency(summary.totalAmount),
            label: labels.total || "Total Requested",
        },
        {
            key: "pending",
            icon: Clock3,
            iconClass: "orange",
            value: formatCurrency(summary.totalPendingAmount),
            label: labels.pending || "Pending Amount",
        },
        {
            key: "approved",
            icon: CheckCircle2,
            iconClass: "green",
            value: formatCurrency(summary.totalApproved),
            label: labels.approved || "Approved",
        },
        {
            key: "paid",
            icon: Banknote,
            iconClass: "purple",
            value: formatCurrency(summary.totalPaid),
            label: labels.paid || "Total Paid",
        },
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
   REQUEST FORM MODAL
=========================== */
function RequestFormModal({ open, onClose, onSubmit, employees = [], canApprove = false }) {
    const [formData, setFormData] = useState({
        requestType: "ADVANCE",
        amount: "",
        reason: "",
        repaymentOption: "MONTHLY_INSTALLMENTS",
        totalInstallments: 0,
        isEmergency: false,
        priority: "MEDIUM",
        employeeId: "",
    });

    const [errors, setErrors] = useState({});

    const handleChange = (field) => (e) => {
        const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.requestType) {
            newErrors.requestType = "Request type is required";
        }

        if (!formData.amount || Number(formData.amount) <= 0) {
            newErrors.amount = "Amount must be greater than 0";
        }

        if (!formData.reason || !formData.reason.trim()) {
            newErrors.reason = "Reason is required";
        }

        if (!formData.repaymentOption) {
            newErrors.repaymentOption = "Repayment option is required";
        }



        if (formData.repaymentOption === "MONTHLY_INSTALLMENTS" &&
            (!formData.totalInstallments || Number(formData.totalInstallments) <= 0)) {
            newErrors.totalInstallments = "Total installments must be greater than 0";
        }

        if (canApprove && !formData.employeeId) {
            newErrors.employeeId = "Employee is required";
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
        <div className="advance-modal-overlay" onClick={onClose}>
            <div className="advance-modal" onClick={(e) => e.stopPropagation()}>
                <div className="advance-modal-header">
                    <h3>
                        Request {formData.requestType === "ADVANCE" ? "Advance" : "Loan"}
                        {formData.isEmergency && (
                            <span className="emergency-badge">⚠️ Emergency</span>
                        )}
                    </h3>
                    <button className="advance-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="advance-modal-body">
                    <p className="advance-modal-subtitle">
                        Fill in the details to submit your request
                    </p>

                    <div className="advance-form">
                        {canApprove && employees.length > 0 && (
                            <div className="form-group">
                                <label>Employee *</label>
                                <select
                                    className={`form-control ${errors.employeeId ? "error" : ""}`}
                                    value={formData.employeeId}
                                    onChange={handleChange("employeeId")}
                                >
                                    <option value="">Select Employee</option>
                                    {employees.map((emp) => (
                                        <option key={emp._id} value={emp._id}>
                                            {emp.employeeCode} — {emp.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.employeeId && (
                                    <span className="form-error">{errors.employeeId}</span>
                                )}
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
                            {errors.requestType && (
                                <span className="form-error">{errors.requestType}</span>
                            )}
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
                            {errors.amount && (
                                <span className="form-error">{errors.amount}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Reason *</label>
                            <textarea
                                className={`form-control form-control--textarea ${errors.reason ? "error" : ""}`}
                                placeholder="Explain why you need this advance/loan..."
                                value={formData.reason}
                                onChange={handleChange("reason")}
                                rows="3"
                            />
                            {errors.reason && (
                                <span className="form-error">{errors.reason}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Repayment Option *</label>
                            <div className="radio-group">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        value="ONE_TIME"
                                        checked={formData.repaymentOption === "ONE_TIME"}
                                        onChange={handleChange("repaymentOption")}
                                    />
                                    One Time Payment
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        value="MONTHLY_INSTALLMENTS"
                                        checked={formData.repaymentOption === "MONTHLY_INSTALLMENTS"}
                                        onChange={handleChange("repaymentOption")}
                                    />
                                    Monthly Installments
                                </label>
                            </div>
                            {errors.repaymentOption && (
                                <span className="form-error">{errors.repaymentOption}</span>
                            )}
                        </div>



                        {formData.repaymentOption === "MONTHLY_INSTALLMENTS" && (
                            <div className="form-group">
                                <label>Total Installments *</label>
                                <input
                                    type="number"
                                    className={`form-control ${errors.totalInstallments ? "error" : ""}`}
                                    placeholder="Number of months"
                                    value={formData.totalInstallments}
                                    onChange={handleChange("totalInstallments")}
                                    min="1"
                                />
                                {errors.totalInstallments && (
                                    <span className="form-error">{errors.totalInstallments}</span>
                                )}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Priority</label>
                            <select
                                className="form-control"
                                value={formData.priority}
                                onChange={handleChange("priority")}
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>

                        <div className="form-group checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.isEmergency}
                                    onChange={handleChange("isEmergency")}
                                />
                                <span>Mark as Emergency Request</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="advance-modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn-primary" onClick={handleSubmit}>
                        <IndianRupee size={16} />
                        Submit Request
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

    useEffect(() => {
        if (request) {
            let amount = "";
            // Auto-fill amount for monthly installments
            if (request.repaymentOption === "MONTHLY_INSTALLMENTS" && request.totalInstallments > 0) {
                const totalPayable = request.totalPayableAmount || request.amount;
                const monthlyAmount = totalPayable / request.totalInstallments;
                // Only auto-fill if remaining amount matches a full installment
                if (Math.abs(request.remainingAmount - monthlyAmount) < 0.01 || request.remainingAmount >= monthlyAmount) {
                    amount = monthlyAmount.toFixed(2);
                }
            }
            setFormData((prev) => ({
                ...prev,
                amount,
            }));
        }
    }, [request]);

    const handleChange = (field) => (e) => {
        setFormData((prev) => ({
            ...prev,
            [field]: e.target.value,
        }));
    };

    const handleSubmit = () => {
        const amount = Number(formData.amount);
        if (!amount || amount <= 0) {
            alert("Please enter a valid payment amount");
            return;
        }
        if (request && amount > request.remainingAmount) {
            alert(`Amount cannot exceed remaining amount of ${formatCurrency(request.remainingAmount)}`);
            return;
        }
        onSubmit({
            ...formData,
            amount: Number(formData.amount),
            paymentDate: formData.paymentDate,
            paymentMethod: formData.paymentMethod,
            referenceNumber: formData.referenceNumber || "",
            remarks: formData.remarks || "",
        });
    };

    if (!open || !request) return null;

    return (
        <div className="advance-modal-overlay" onClick={onClose}>
            <div className="advance-modal payment-modal" onClick={(e) => e.stopPropagation()}>
                <div className="advance-modal-header">
                    <h3>Record Payment</h3>
                    <button className="advance-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="advance-modal-body">
                    <div className="payment-request-info">
                        <div className="info-row">
                            <span className="info-label">Employee - </span>
                            <span className="info-value">{request.employeeId?.name || "-"}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Type - </span>
                            <span className="info-value">{getTypeLabel(request.requestType)}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Remaining Amount - </span>
                            <span className="info-value highlight">{formatCurrency(request.remainingAmount)}</span>
                        </div>
                    </div>

                    <div className="advance-form">
                        <div className="form-group">
                            <label>Amount *</label>
                            <input
                                type="number"
                                className="form-control"
                                placeholder="Enter payment amount"
                                value={formData.amount}
                                onChange={handleChange("amount")}
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="form-group">
                            <label>Payment Date *</label>
                            <input
                                type="date"
                                className="form-control"
                                value={formData.paymentDate}
                                onChange={handleChange("paymentDate")}
                                max={new Date().toISOString().split("T")[0]}
                            />
                        </div>

                        <div className="form-group">
                            <label>Payment Method *</label>
                            <select
                                className="form-control"
                                value={formData.paymentMethod}
                                onChange={handleChange("paymentMethod")}
                            >
                                {PAYMENT_METHODS.map((method) => (
                                    <option key={method} value={method}>
                                        {method.replace("_", " ")}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Reference Number</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Enter reference number"
                                value={formData.referenceNumber}
                                onChange={handleChange("referenceNumber")}
                            />
                        </div>

                        <div className="form-group">
                            <label>Remarks</label>
                            <textarea
                                className="form-control form-control--textarea"
                                placeholder="Add any remarks..."
                                value={formData.remarks}
                                onChange={handleChange("remarks")}
                                rows="2"
                            />
                        </div>
                    </div>
                </div>

                <div className="advance-modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn-primary" onClick={handleSubmit}>
                        <Banknote size={16} />
                        Record Payment
                    </button>
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
    const interestAmount = isLoan ? request.interestAmount || 0 : 0;
    const totalPayable = request.totalPayableAmount || request.amount + interestAmount;

    const getMethodLabel = (method) => {
        const labels = {
            SALARY_DEDUCTION: "Salary Deduction",
            CASH: "Cash",
            BANK_TRANSFER: "Bank Transfer",
            OTHER: "Other",
        };
        return labels[method] || method;
    };

    return (
        <div className="advance-modal-overlay" onClick={onClose}>
            <div className="advance-modal detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="advance-modal-header">
                    <h3>Request Details</h3>
                    <button className="advance-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="advance-modal-body">
                    {/* Summary Cards */}
                    <div className="detail-summary-grid">
                        <div className="detail-summary-card">
                            <div className="detail-summary-label">Total Amount</div>
                            <div className="detail-summary-value">{formatCurrency(request.amount)}</div>
                        </div>
                        {isLoan && (
                            <div className="detail-summary-card">
                                <div className="detail-summary-label">Interest</div>
                                <div className="detail-summary-value">{formatCurrency(interestAmount)}</div>
                            </div>
                        )}
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
                                <span className={STATUS_CLASS[request.status] || "advance-status"}>
                                    {STATUS_LABELS[request.status] || request.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Request Info */}
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
                                <span className="detail-info-label">Reason</span>
                                <span className="detail-info-value">{request.reason || "-"}</span>
                            </div>
                            <div className="detail-info-row">
                                <span className="detail-info-label">Repayment Option</span>
                                <span className="detail-info-value">
                                    {request.repaymentOption === "ONE_TIME" ? "One Time" :
                                        request.repaymentOption === "MONTHLY_INSTALLMENTS" ? `${request.totalInstallments} Months` :
                                            "Custom Schedule"}
                                </span>
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

                    {/* Payment History */}
                    <div className="detail-section">
                        <h4>Payment History</h4>
                        {paymentHistory.length === 0 ? (
                            <p className="detail-empty">No payments recorded yet</p>
                        ) : (
                            <div className="detail-payment-table-wrapper">
                                <table className="detail-payment-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Amount</th>
                                            <th>Method</th>
                                            <th>Reference</th>
                                            <th>Recorded By</th>
                                            <th>Remarks</th>
                                        </tr>
                                    </thead>
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

                    {/* Custom Schedule */}
                    {request.customRepaymentSchedule && request.customRepaymentSchedule.length > 0 && (
                        <div className="detail-section">
                            <h4>Repayment Schedule</h4>
                            <div className="detail-payment-table-wrapper">
                                <table className="detail-payment-table">
                                    <thead>
                                        <tr>
                                            <th>Due Date</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Paid Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {request.customRepaymentSchedule.map((item, index) => (
                                            <tr key={index}>
                                                <td>{formatDate(item.date)}</td>
                                                <td className="amount-cell">{formatCurrency(item.amount)}</td>
                                                <td>
                                                    <span className={`schedule-status ${item.status?.toLowerCase()}`}>
                                                        {item.status || "PENDING"}
                                                    </span>
                                                </td>
                                                <td>{item.paidDate ? formatDate(item.paidDate) : "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Comments */}
                    {request.comments && request.comments.length > 0 && (
                        <div className="detail-section">
                            <h4>Comments</h4>
                            <div className="detail-comments">
                                {request.comments.map((comment, index) => (
                                    <div key={index} className="detail-comment">
                                        <div className="detail-comment-header">
                                            <span className="detail-comment-author">
                                                {comment.commentedBy?.name || comment.commentedBy?.employeeCode || "Unknown"}
                                            </span>
                                            <span className="detail-comment-date">
                                                {formatDate(comment.commentedAt)}
                                            </span>
                                        </div>
                                        <div className="detail-comment-text">{comment.comment}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="advance-modal-footer">
                    <button className="btn-primary" onClick={onClose}>
                        Close
                    </button>
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

    /* ── State ── */
    const [dashboard, setDashboard] = useState(null);
    const [requests, setRequests] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailRequest, setDetailRequest] = useState(null);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterType, setFilterType] = useState("");

    const [modal, setModal] = useState({
        open: false,
        title: "",
        message: "",
        confirmLabel: "Confirm",
        variant: "danger",
        onConfirm: null,
        withInput: false,
        inputValue: "",
    });

    const modalInputRef = useRef("");


    const closeModal = () =>
        setModal((m) => ({ ...m, open: false, inputValue: "" }));

    const openModal = (config) => {
        modalInputRef.current = "";
        setModal({ open: true, inputValue: "", withInput: false, ...config });
    };


    /* ── Statistics ── */
    const summary = dashboard?.statistics || {};

    const teamMembers = useMemo(() => {
        if (!user?.employeeId) return employees;
        return employees.filter(
            (emp) => String(emp._id) !== String(user.employeeId)
        );
    }, [employees, user?.employeeId]);

    /* ── Data Loading ── */
    const loadData = async () => {
        setLoading(true);
        setError("");
        try {
            const isAdminOrHR = canManageEmployees(user?.role);
            let dashRes = null;
            let reqRes = null;

            if (isAdminOrHR) {
                [dashRes, reqRes] = await Promise.all([
                    getStatistics(),
                    getAllRequests(),
                ]);
            } else {
                reqRes = await getMyRequests();
                // Calculate stats from own requests
                const myReqs = reqRes.requests || [];
                const totalAmount = myReqs.reduce((sum, r) => sum + (r.amount || 0), 0);
                const totalPendingAmount = myReqs
                    .filter(r => ["APPROVED", "PARTIALLY_PAID"].includes(r.status))
                    .reduce((sum, r) => sum + (r.remainingAmount || 0), 0);
                const totalPaid = myReqs.reduce((sum, r) => sum + (r.totalPaid || 0), 0);
                const totalRequests = myReqs.length;
                const pendingRequests = myReqs.filter(r => r.status === "PENDING").length;
                const approvedRequests = myReqs.filter(r => ["APPROVED", "PARTIALLY_PAID"].includes(r.status)).length;
                const rejectedRequests = myReqs.filter(r => r.status === "REJECTED").length;
                dashRes = {
                    statistics: {
                        totalRequests,
                        pendingRequests,
                        approvedRequests,
                        rejectedRequests,
                        totalAmount,
                        totalPendingAmount,
                        totalPaid,
                    },
                    recentRequests: myReqs.slice(0, 5),
                };
            }

            setDashboard(dashRes);
            setRequests(reqRes.requests || []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const loadEmployees = async () => {
        if (!canApprove) return;
        try {
            const res = await getEmployees();
            setEmployees(res.data?.employees || []);
        } catch {
            // non-blocking
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadEmployees();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.role]);

    /* ── Request Handlers ── */
    const handleCreateRequest = async (formData) => {
        try {
            await createAdvanceLoanRequest(formData);
            toast.success(`${formData.requestType} request submitted successfully`);
            setShowRequestForm(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit request");
        }
    };

    const handleCancelRequest = (id) => {
        openModal({
            title: "Cancel Request",
            message: "Are you sure you want to cancel this request?",
            confirmLabel: "Cancel Request",
            variant: "danger",
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    await cancelRequest(id);
                    toast.success("Request cancelled successfully");
                    loadData();
                } catch (err) {
                    toast.error(err.response?.data?.message || "Cancel failed");
                } finally {
                    setActionLoading(false);
                    closeModal();
                }
            },
        });
    };

    const handleApprove = (id, name) => {
        openModal({
            title: "Approve Request",
            message: `Are you sure you want to approve${name ? ` ${name}'s` : " this"} request?`,
            confirmLabel: "Approve",
            variant: "success",
            withInput: true,
            inputValue: "",
            inputLabel: "Comments (optional)",
            inputPlaceholder: "Add any comments...",
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    await approveRequest(id, modalInputRef.current);
                    toast.success("Request approved successfully");
                    loadData();
                } catch (err) {
                    toast.error(err.response?.data?.message || "Approve failed");
                } finally {
                    setActionLoading(false);
                    closeModal();
                }
            },
        });
    };

    const handleReject = (id, name) => {
        openModal({
            title: "Reject Request",
            message: `You are about to reject${name ? ` ${name}'s` : " this"} request. Please provide a reason.`,
            confirmLabel: "Reject",
            variant: "danger",
            withInput: true,
            inputValue: "",
            inputLabel: "Rejection Reason *",
            inputPlaceholder: "Please provide a reason for rejection...",
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    console.log("df", modalInputRef.current)
                    await rejectRequest(id, { rejectionReason: modalInputRef.current });
                    toast.warning("Request rejected");
                    loadData();
                } catch (err) {
                    toast.error(err.response?.data?.message || "Reject failed");
                } finally {
                    setActionLoading(false);
                    closeModal();
                }
            },
        });
    };

    const handleRecordPayment = async (paymentData) => {
        if (!selectedRequest) return;
        try {
            await recordPayment(selectedRequest._id, paymentData);
            toast.success("Payment recorded successfully");
            setShowPaymentModal(false);
            setSelectedRequest(null);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to record payment");
        }
    };

    const handleViewDetails = async (id) => {
        try {
            setActionLoading(true);
            const response = await getRequestDetails(id);
            setDetailRequest(response.data?.request || response.request);
            setShowDetailModal(true);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to load details");
        } finally {
            setActionLoading(false);
        }
    };

    /* ── View Helpers ── */
    const matchesUser = useCallback(
        (item) => {
            const empId = item.employeeId?._id || item.employeeId;
            if (user?.employeeId && empId && String(empId) === String(user.employeeId))
                return true;
            const empName = item.employeeId?.name?.toLowerCase?.();
            return empName && empName === user?.name?.toLowerCase?.();
        },
        [user?.employeeId, user?.name]
    );

    const filteredRequests = useMemo(() => {
        let filtered = requests;
        if (filterStatus) {
            filtered = filtered.filter((r) => r.status === filterStatus);
        }
        if (filterType) {
            filtered = filtered.filter((r) => r.requestType === filterType);
        }
        return filtered;
    }, [requests, filterStatus, filterType]);

    const myRequests = useMemo(
        () => filteredRequests.filter(matchesUser),
        [filteredRequests, matchesUser]
    );

    const pendingRequests = useMemo(
        () => filteredRequests.filter((r) => r.status === "PENDING"),
        [filteredRequests]
    );

    const approvedRequests = useMemo(
        () => filteredRequests.filter((r) => r.status === "APPROVED" || r.status === "PARTIALLY_PAID"),
        [filteredRequests]
    );

    /* ===========================
       RENDER: Request Table
    =========================== */
    const renderRequestTable = ({
        title,
        items,
        showEmployee = false,
        showActions = false,
        actionMode = "owner",
    }) => (
        <section className="advance-card">
            <h3>{title}</h3>
            <div style={{ overflowX: "auto" }}>
                <table className="advance-table">
                    <thead>
                        <tr>
                            {showEmployee ? <th>Employee</th> : null}
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Reason</th>
                            <th>Repayment</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Priority</th>
                            {showActions ? <th>Actions</th> : null}
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={
                                        showEmployee
                                            ? showActions ? 9 : 8
                                            : showActions ? 8 : 7
                                    }
                                    className="advance-empty"
                                >
                                    No requests found
                                </td>
                            </tr>
                        ) : null}
                        {items.map((req) => {
                            const empName = req.employeeId?.name || null;
                            const isOwner = String(req.employeeId?._id || req.employeeId) === String(user?.employeeId);
                            const canCancel = req.status === "PENDING" && isOwner;
                            const canApproveAction = req.status === "PENDING" && !isOwner && canApprove;
                            const canRecordPayment = (req.status === "APPROVED" || req.status === "PARTIALLY_PAID") && !isOwner && canApprove && req.remainingAmount > 0;
                            const canView = ["APPROVED", "PARTIALLY_PAID", "FULLY_PAID"].includes(req.status);

                            return (
                                <tr key={req._id}>
                                    {showEmployee ? <td>{empName || "-"}</td> : null}
                                    <td>
                                        <span className="advance-type-badge">
                                            {getTypeLabel(req.requestType)}
                                        </span>
                                    </td>
                                    <td className="amount-cell">{formatCurrency(req.amount)}</td>
                                    <td className="reason-cell" title={req.reason}>
                                        {req.reason.length > 40
                                            ? `${req.reason.substring(0, 40)}...`
                                            : req.reason}
                                    </td>
                                    <td>
                                        {req.repaymentOption === "ONE_TIME" ? (
                                            "One Time"
                                        ) : req.repaymentOption === "MONTHLY_INSTALLMENTS" ? (
                                            `${req.totalInstallments} months`
                                        ) : (
                                            "Custom"
                                        )}
                                    </td>
                                    <td>{formatDate(req.createdAt)}</td>
                                    <td>
                                        <span className={STATUS_CLASS[req.status] || "advance-status"}>
                                            {STATUS_LABELS[req.status] || req.status}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={getPriorityBadge(req.priority, req.status)}>
                                            {req.priority}
                                        </span>
                                    </td>
                                    {showActions ? (
                                        <td>
                                            <div className="advance-actions">
                                                {canCancel && (
                                                    <button
                                                        className="action-btn cancel-btn"
                                                        onClick={() => handleCancelRequest(req._id)}
                                                    >
                                                        <X size={14} />
                                                        Cancel
                                                    </button>
                                                )}

                                                {canApproveAction && (actionMode === "approve" || actionMode === "full") && (
                                                    <>
                                                        <button
                                                            className="action-btn approve-btn"
                                                            onClick={() => handleApprove(req._id, empName)}
                                                        >
                                                            <Check size={14} />
                                                            Approve
                                                        </button>
                                                        <button
                                                            className="action-btn reject-btn"
                                                            onClick={() => handleReject(req._id, empName)}
                                                        >
                                                            <X size={14} />
                                                            Reject
                                                        </button>
                                                    </>
                                                )}

                                                {canRecordPayment && actionMode === "payment" && (
                                                    <button
                                                        className="action-btn payment-btn"
                                                        onClick={() => {
                                                            setSelectedRequest(req);
                                                            setShowPaymentModal(true);
                                                        }}
                                                    >
                                                        <Banknote size={14} />
                                                        Record Payment
                                                    </button>
                                                )}

                                                {canView && (
                                                    <button
                                                        className="action-btn view-btn"
                                                        onClick={() => handleViewDetails(req._id)}
                                                    >
                                                        <Clock3 size={14} />
                                                        View
                                                    </button>
                                                )}

                                                {req.status === "PENDING" && isOwner && !canApprove && (
                                                    <span className="awaiting-text">Awaiting approval</span>
                                                )}
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

    /* ===========================
       RENDER: Employee View
    =========================== */
    const renderEmployeeView = () => (
        <>
            <div className="advance-page-header">
                <div className="advance-header-left">
                    <h2 className="advance-page-title">My Advances & Loans</h2>
                    <p className="advance-page-subtitle">
                        Request advances or loans and track your repayments
                    </p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setShowRequestForm(true)}
                >
                    <IndianRupee size={16} />
                    New Request
                </button>
            </div>

            <AdvanceLoanSummaryCards
                summary={summary}
                labels={{
                    total: "My Total",
                    pending: "My Pending",
                    approved: "My Approved",
                    paid: "My Paid",
                }}
            />

            {renderRequestTable({
                title: "My Recent Requests",
                items: myRequests.slice(0, 10),
                showActions: true,
                actionMode: "owner",
            })}
        </>
    );

    /* ===========================
       RENDER: Manager View
    =========================== */
    const renderManagerView = () => (
        <>
            <div className="advance-page-header">
                <div className="advance-header-left">
                    <h2 className="advance-page-title">Team Advances & Loans</h2>
                    <p className="advance-page-subtitle">
                        Manage your team's advance and loan requests
                    </p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setShowRequestForm(true)}
                >
                    <IndianRupee size={16} />
                    New Request
                </button>
            </div>

            {teamMembers.length > 0 && (
                <div className="advance-role-banner manager">
                    <Users size={18} />
                    <span>
                        Managing {teamMembers.length} team member{teamMembers.length === 1 ? "" : "s"}
                    </span>
                </div>
            )}

            <AdvanceLoanSummaryCards
                summary={summary}
                labels={{
                    total: "Team Total",
                    pending: "Team Pending",
                    approved: "Team Approved",
                    paid: "Team Paid",
                }}
            />

            <div className="advance-layout-grid">
                {renderRequestTable({
                    title: "Pending Approvals",
                    items: pendingRequests,
                    showEmployee: true,
                    showActions: true,
                    actionMode: "approve",
                })}
                {renderRequestTable({
                    title: "Active Requests",
                    items: approvedRequests,
                    showEmployee: true,
                    showActions: true,
                    actionMode: "payment",
                })}
            </div>

            {renderRequestTable({
                title: "All Team Requests",
                items: requests,
                showEmployee: true,
            })}
        </>
    );

    /* ===========================
       RENDER: Admin View
    =========================== */
    const renderAdminView = () => (
        <>
            <div className="advance-page-header">
                <div className="advance-header-left">
                    <h2 className="advance-page-title">Advance & Loan Management</h2>
                    <p className="advance-page-subtitle">
                        Manage all advance and loan requests across the organization
                    </p>
                </div>
                <div className="advance-header-actions">
                    <button className="btn-secondary" onClick={loadData}>
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => setShowRequestForm(true)}
                    >
                        <IndianRupee size={16} />
                        New Request
                    </button>
                </div>
            </div>

            <AdvanceLoanSummaryCards summary={summary} />

            <div className="advance-stats-grid">
                <div className="stat-card">
                    <div className="stat-item">
                        <span className="stat-label">Total Requests</span>
                        <span className="stat-value">{summary.totalRequests || 0}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-item">
                        <span className="stat-label">Pending</span>
                        <span className="stat-value pending">{summary.pendingRequests || 0}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-item">
                        <span className="stat-label">Approved</span>
                        <span className="stat-value approved">{summary.approvedRequests || 0}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-item">
                        <span className="stat-label">Rejected</span>
                        <span className="stat-value rejected">{summary.rejectedRequests || 0}</span>
                    </div>
                </div>
            </div>

            <div className="advance-filter-bar">
                <div className="filter-group">
                    <label>Status</label>
                    <select
                        className="filter-select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">All Status</option>
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Type</label>
                    <select
                        className="filter-select"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="">All Types</option>
                        <option value="ADVANCE">Advance</option>
                        <option value="LOAN">Loan</option>
                    </select>
                </div>
            </div>

            <div className="advance-layout-grid">
                {renderRequestTable({
                    title: "Pending Approvals",
                    items: pendingRequests,
                    showEmployee: true,
                    showActions: true,
                    actionMode: "full",
                })}
                {renderRequestTable({
                    title: "Active Requests",
                    items: approvedRequests,
                    showEmployee: true,
                    showActions: true,
                    actionMode: "payment",
                })}
            </div>

            {renderRequestTable({
                title: "All Requests",
                items: filteredRequests,
                showEmployee: true,
            })}
        </>
    );

    const roleViews = {
        Organization: renderAdminView,
        HR: renderAdminView,
        Admin: renderAdminView,
        Manager: renderManagerView,
        Employee: renderEmployeeView,
    };

    /* ===========================
       PAGE RENDER
    =========================== */
    return (
        <MainLayout>
            <div className="advance-page">
                {error ? <p className="advance-error">{error}</p> : null}

                {loading && !dashboard ? (
                    <p className="advance-empty">Loading data...</p>
                ) : (
                    roleViews[user?.role]?.() || roleViews.Employee()
                )}

                <RequestFormModal
                    open={showRequestForm}
                    onClose={() => setShowRequestForm(false)}
                    onSubmit={handleCreateRequest}
                    employees={employees}
                    canApprove={canApprove}
                />

                <PaymentModal
                    open={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setSelectedRequest(null);
                    }}
                    request={selectedRequest}
                    onSubmit={handleRecordPayment}
                />

                <DetailModal
                    open={showDetailModal}
                    onClose={() => setShowDetailModal(false)}
                    request={detailRequest}
                />

                <ConfirmModal
                    open={modal.open}
                    title={modal.title}
                    message={modal.message}
                    confirmLabel={modal.confirmLabel}
                    variant={modal.variant}
                    loading={actionLoading}
                    onConfirm={modal.onConfirm}
                    onCancel={closeModal}
                    inputLabel={modal.inputLabel}
                    inputValue={modal.inputValue}
                    onInputChange={(val) => { modalInputRef.current = val; setModal((m) => ({ ...m, inputValue: val })) }}
                    inputPlaceholder={modal.inputPlaceholder}
                />
            </div>
        </MainLayout>
    );
}

/* ===========================
   PAGE EXPORT
=========================== */
function AdvanceLoan() {
    return (
        <ToastProvider>
            <AdvanceLoanInner />
        </ToastProvider>
    );
}

export default AdvanceLoan;