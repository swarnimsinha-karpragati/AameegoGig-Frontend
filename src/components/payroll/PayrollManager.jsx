import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Calculator, CheckCircle, XCircle, RefreshCw, Eye, ChevronDown, ChevronUp,
  Search, Calendar, Users, Zap, FileText, TrendingUp,
} from "lucide-react";
import { getAvailableMonths, PAYROLL_YEARS, formatInr } from "../../utils/payrollConstants";
import Button from "../Button";

/** Local (browser-timezone) today as YYYY-MM-DD — avoids the UTC shift of toISOString(). */
const todayLocalISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export default function PayrollManager({
  employees,
  payrolls,
  reviewPayrolls,
  actionLoading,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  onPreview,
  onCalculateSingle,
  onBulkCalculate,
  onApproveSingle,
  onDeleteSingle,
  onBulkApprove,
  onViewBreakdown,
  statusMessage,
}) {
  const [payrollType, setPayrollType] = useState("monthly");
  const [selectedEmp, setSelectedEmp] = useState("");
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [comment, setComment] = useState("");
  const [payrollDate, setPayrollDate] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const empWrapRef = useRef(null);

  const allReview = reviewPayrolls || payrolls;

  const pendingPayrolls = useMemo(
    () => allReview.filter((p) => p.approvalStatus !== "Approved" && p.status !== "Processed"),
    [allReview]
  );

  const approvedPayrolls = useMemo(
    () => allReview.filter((p) => p.approvalStatus === "Approved" || p.status === "Processed"),
    [allReview]
  );

  const stats = useMemo(() => {
    const totalGross = payrolls.reduce((s, p) => s + (p.totalEarnings || 0), 0);
    const totalDeductions = payrolls.reduce((s, p) => s + (p.totalDeduction || 0), 0);
    const totalNet = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0);
    return { totalGross, totalDeductions, totalNet, total: payrolls.length };
  }, [payrolls]);

  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
    const eligible = employees.filter((e) => {
      if (!e.ctcStructureId) return false;
      if (e.relievingDate) {
        const rd = new Date(e.relievingDate);
        if (!Number.isNaN(rd.getTime()) && rd < monthStart) return false;
      }
      return true;
    });
    if (!q) return eligible;
    return eligible.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.employeeCode?.toLowerCase().includes(q)
    );
  }, [employees, empSearch, selectedMonth, selectedYear]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (empWrapRef.current && !empWrapRef.current.contains(e.target)) {
        setEmpDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleEmpSelect = (empId) => {
    setSelectedEmpIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(pendingPayrolls.map((p) => p._id));
    }
    setSelectAll(!selectAll);
  };

  const getPeriod = () => {
    if (payrollType === "daily" && payrollDate) {
      // Parse the YYYY-MM-DD string directly — new Date("2026-08-14") is UTC
      // midnight and shifts the month on some timezones.
      const [year, month] = payrollDate.split("-").map(Number);
      return { month, year };
    }
    return { month: selectedMonth, year: selectedYear };
  };

  const handleBulkCalc = () => {
    const empIds = selectedEmpIds.length > 0 ? selectedEmpIds : undefined;
    const { month, year } = getPeriod();
    onBulkCalculate({
      payrollType,
      month,
      year,
      employeeIds: empIds,
      payrollDate: payrollType === "daily" ? payrollDate : undefined,
    });
  };

  const handleBulkApprove = () => {
    if (selectedEmpIds.length === 0) return;
    const ids = selectAll ? pendingPayrolls.map((p) => p._id) : selectedEmpIds;
    onBulkApprove(ids, comment);
    setComment("");
  };

  const handlePreview = () => {
    if (!selectedEmp) return;
    const emp = JSON.parse(selectedEmp);
    const { month, year } = getPeriod();
    onPreview({
      employeeId: emp.code,
      month,
      year,
      payrollType,
      payrollDate: payrollType === "daily" ? payrollDate : undefined,
    });
  };

  const handleCalculate = () => {
    if (!selectedEmp) return;
    const emp = JSON.parse(selectedEmp);
    const { month, year } = getPeriod();
    onCalculateSingle({
      employeeId: emp.id,
      month,
      year,
      payrollType,
      payrollDate: payrollType === "daily" ? payrollDate : undefined,
    });
  };

  const dailyReady = payrollType !== "daily" || payrollDate;
  const selectedEmpObj = selectedEmp ? JSON.parse(selectedEmp) : null;
  const selectedEmpName = selectedEmpObj
    ? employees.find((e) => e._id === selectedEmpObj.id)?.name || ""
    : "";

  return (
    <div className="pm-new">
      {/* ── Stats Bar ── */}
      <div className="pm-stats">
        <div className="pm-stat-card">
          <div className="pm-stat-icon pm-stat-icon--blue">
            <Users size={18} />
          </div>
          <div className="pm-stat-body">
            <span className="pm-stat-label">Total Records</span>
            <span className="pm-stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-icon pm-stat-icon--amber">
            <FileText size={18} />
          </div>
          <div className="pm-stat-body">
            <span className="pm-stat-label">Pending Review</span>
            <span className="pm-stat-value">{pendingPayrolls.length}</span>
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-icon pm-stat-icon--green">
            <CheckCircle size={18} />
          </div>
          <div className="pm-stat-body">
            <span className="pm-stat-label">Approved</span>
            <span className="pm-stat-value">{approvedPayrolls.length}</span>
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-icon pm-stat-icon--emerald">
            <TrendingUp size={18} />
          </div>
          <div className="pm-stat-body">
            <span className="pm-stat-label">Total Net Pay</span>
            <span className="pm-stat-value">{formatInr(stats.totalNet)}</span>
          </div>
        </div>
      </div>

      {/* ── Calculator Card ── */}
      <div className="pm-calc-card">
        <div className="pm-calc-header">
          <div className="pm-calc-title-group">
            <div className="pm-calc-icon-wrap">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="pm-calc-title">Payroll Calculator</h3>
              <p className="pm-calc-subtitle">Select employee and run calculation for the chosen period</p>
            </div>
          </div>
          <div className="pm-type-pills">
            <button
              className={`pm-pill ${payrollType === "monthly" ? "pm-pill--active" : ""}`}
              onClick={() => setPayrollType("monthly")}
              type="button"
            >
              <Calendar size={14} />
              Monthly
            </button>
            <button
              className={`pm-pill ${payrollType === "daily" ? "pm-pill--active" : ""}`}
              onClick={() => setPayrollType("daily")}
              type="button"
            >
              <Zap size={14} />
              Daily Basis Salary
            </button>
          </div>
        </div>

        <div className="pm-calc-body">
          {/* Row 1: Period */}
          <div className="pm-calc-row">
            {payrollType === "monthly" ? (
              <div className="pm-calc-field pm-calc-field--period">
                <label className="pm-calc-label">Period</label>
                <div className="pm-calc-period-group">
                  <select
                    value={selectedMonth}
                    onChange={(e) => onMonthChange(parseInt(e.target.value, 10))}
                    className="pm-calc-select"
                  >
                    {getAvailableMonths(selectedYear).map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
                    className="pm-calc-select pm-calc-select--year"
                  >
                    {PAYROLL_YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="pm-calc-field">
                <label className="pm-calc-label">Payroll Date</label>
                <input
                  type="date"
                  value={payrollDate}
                  onChange={(e) => setPayrollDate(e.target.value)}
                  className="pm-calc-select"
                  max={todayLocalISO()}
                />
                <span className="pm-calc-hint">
                  Attendance must already be marked for the selected date
                </span>
              </div>
            )}
          </div>

          {/* Row 2: Employee */}
          <div className="pm-calc-row">
            <div className="pm-calc-field pm-calc-field--full" ref={empWrapRef}>
              <label className="pm-calc-label">Employee</label>
              <div className="pm-calc-emp-wrap">
                <Search size={15} className="pm-calc-emp-icon" />
                <input
                  type="text"
                  placeholder="Search by name or code..."
                  value={selectedEmp ? `${selectedEmpObj?.code} — ${selectedEmpName}` : empSearch}
                  onChange={(e) => {
                    setEmpSearch(e.target.value);
                    setSelectedEmp("");
                    setEmpDropdownOpen(true);
                  }}
                  onFocus={() => setEmpDropdownOpen(true)}
                  className="pm-calc-select pm-calc-select--emp"
                />
                {selectedEmp && (
                  <button
                    className="pm-calc-clear"
                    onClick={() => { setSelectedEmp(""); setEmpSearch(""); setEmpDropdownOpen(true); }}
                    type="button"
                  >
                    &times;
                  </button>
                )}
                {empDropdownOpen && filteredEmployees.length > 0 && (
                  <div className="pm-calc-dropdown">
                    {filteredEmployees.slice(0, 50).map((emp) => (
                      <div
                        key={emp._id}
                        className={`pm-calc-dropdown-item ${selectedEmpObj?.id === emp._id ? "selected" : ""}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedEmp(JSON.stringify({ id: emp._id, code: emp.employeeCode }));
                          setEmpSearch("");
                          setEmpDropdownOpen(false);
                        }}
                      >
                        <span className="pm-dropdown-code">{emp.employeeCode}</span>
                        <span className="pm-dropdown-name">{emp.name}</span>
                      </div>
                    ))}
                    {filteredEmployees.length > 50 && (
                      <div className="pm-dropdown-more">+ {filteredEmployees.length - 50} more</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Actions */}
          <div className="pm-calc-row pm-calc-row--actions">
            <div className="pm-calc-field">
              <label className="pm-calc-label">Actions</label>
              <div className="pm-calc-btn-row">
                <Button
                  icon={<Eye size={15} />}
                  onClick={handlePreview}
                  disabled={actionLoading || !selectedEmp || !dailyReady}
                  type="button"
                >
                  
                  Preview
                </Button>
                <Button
                  icon={<Calculator size={15} />}
                  onClick={handleCalculate}
                  disabled={actionLoading || !selectedEmp || !dailyReady}
                  type="button"
                >
                  
                  Calculate
                </Button>
                <div className="pm-calc-sep" />
                <div className="pm-calc-bulk-group">
                  <Button
                    icon={<RefreshCw size={15} className={actionLoading ? "spin" : ""} />}
                    onClick={handleBulkCalc}
                    disabled={actionLoading || !dailyReady}
                    type="button"
                  >
                    
                    Calculate All
                  </Button>
                  <span className="pm-calc-hint">
                    <Zap size={11} />
                    Calculates payroll for all eligible employees
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Message ──
      {statusMessage?.text && (
        <div className={`pm-toast pm-toast--${statusMessage.type || "info"}`}>
          {statusMessage.text}
        </div>
      )} */}

      {/* ── Records ── */}
      {allReview.length === 0 ? (
        <div className="pm-empty">
          <div className="pm-empty-graphic">
            <Calculator size={48} strokeWidth={1} />
          </div>
          <h4 className="pm-empty-title">No payroll records found</h4>
          <p className="pm-empty-desc">Select employees above and click Calculate to generate payroll records.</p>
        </div>
      ) : (
        <div className="pm-records-card">
          {/* Pending Section */}
          <div className="pm-records-section">
            <div className="pm-records-header">
              <div className="pm-records-header-left">
                <span className="pm-dot pm-dot--amber" />
                <h4 className="pm-records-title">Pending Review</h4>
                <span className="pm-records-count">{pendingPayrolls.length}</span>
              </div>
              {pendingPayrolls.length > 0 && (
                <div className="pm-records-header-right">
                  <label className="pm-check-toggle">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                    />
                    <span>Select all</span>
                  </label>
                  {selectedEmpIds.length > 0 && (
                    <span className="pm-selected-pill">{selectedEmpIds.length} selected</span>
                  )}
                </div>
              )}
            </div>

            {/* Bulk Approve (inline) */}
            {pendingPayrolls.length > 0 && selectedEmpIds.length > 0 && (
              <div className="pm-bulk-bar">
                <input
                  type="text"
                  placeholder="Comment (optional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="pm-bulk-comment"
                />
                <button
                  className="pm-bulk-btn pm-bulk-btn--approve"
                  onClick={handleBulkApprove}
                  disabled={actionLoading || selectedEmpIds.length === 0}
                  type="button"
                >
                  <CheckCircle size={14} />
                  Approve{selectedEmpIds.length > 0 ? ` (${selectedEmpIds.length})` : ""}
                </button>
              </div>
            )}

            <div className="pm-rows">
              {pendingPayrolls.map((item) => (
                <PayrollRow
                  key={item._id}
                  item={item}
                  isSelected={selectedEmpIds.includes(item._id)}
                  isExpanded={expandedRow === item._id}
                  onToggleSelect={() => toggleEmpSelect(item._id)}
                  onToggleExpand={() => setExpandedRow(expandedRow === item._id ? null : item._id)}
                  onApprove={() => onApproveSingle(item._id)}
                  onDelete={() => onDeleteSingle(item._id)}
                  onViewBreakdown={() => onViewBreakdown(item)}
                  actionLoading={actionLoading}
                  showSelect
                />
              ))}
            </div>
          </div>

          {/* Approved Section */}
          {approvedPayrolls.length > 0 && (
            <div className="pm-records-section">
              <div className="pm-records-header">
                <div className="pm-records-header-left">
                  <span className="pm-dot pm-dot--green" />
                  <h4 className="pm-records-title">Approved / Processed</h4>
                  <span className="pm-records-count">{approvedPayrolls.length}</span>
                </div>
              </div>
              <div className="pm-rows">
                {approvedPayrolls.map((item) => (
                  <PayrollRow
                    key={item._id}
                    item={item}
                    isExpanded={expandedRow === item._id}
                    onToggleExpand={() => setExpandedRow(expandedRow === item._id ? null : item._id)}
                    onViewBreakdown={() => onViewBreakdown(item)}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Payroll Row ── */
function PayrollRow({
  item,
  isSelected = false,
  isExpanded = false,
  onToggleSelect,
  onToggleExpand,
  onApprove,
  onDelete,
  onViewBreakdown,
  actionLoading,
  showSelect = false,
}) {
  const statusConfig = (() => {
    if (item.status === "Processed") return { cls: "pm-status--processed", label: "Processed" };
    if (item.approvalStatus === "Approved") return { cls: "pm-status--approved", label: "Approved" };
    if (item.approvalStatus === "Rejected") return { cls: "pm-status--rejected", label: "Rejected" };
    if (item.approvalStatus === "PendingReview") return { cls: "pm-status--pending", label: "Pending" };
    return { cls: "pm-status--draft", label: "Draft" };
  })();

  const canAct = item.status !== "Processed" && item.approvalStatus !== "Approved";
  const isDaily = item.payrollType === "daily";

  // Whole header toggles expand/collapse in BOTH sections; only native
  // interactive elements (checkbox/buttons/links) are excluded.
  const handleRowHeaderClick = (e) => {
    if (e.target.closest("input, button, a, label")) return;
    onToggleExpand();
  };

  const handleRowKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggleExpand();
    }
  };

  return (
    <div className={`pm-row ${isExpanded ? "pm-row--open" : ""}`}>
      <div
        className="pm-row-top"
        onClick={handleRowHeaderClick}
        onKeyDown={handleRowKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        {showSelect && canAct && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); onToggleSelect(); }}
            onClick={(e) => e.stopPropagation()}
            className="pm-row-check"
          />
        )}

        <div className="pm-row-identity">
          <span className="pm-row-code">{item.employeeCode}</span>
          <span className="pm-row-name">{item.employeeName}</span>
          {isDaily && <span className="pm-tag pm-tag--daily">Daily</span>}
        </div>

        <div className="pm-row-meta">
          <span className="pm-row-period-text">{item.month} {item.year}</span>
          <span className="pm-row-days-text">{item.payableWorkingDays}/{item.totalDaysInMonth} days</span>
        </div>

        <div className="pm-row-amounts">
          <div className="pm-amt-block">
            <span className="pm-amt-label">Gross</span>
            <span className="pm-amt-value">{formatInr(item.totalEarnings)}</span>
          </div>
          <div className="pm-amt-block pm-amt-block--ded">
            <span className="pm-amt-label">Deductions</span>
            <span className="pm-amt-value">{formatInr(item.totalDeduction)}</span>
          </div>
          <div className="pm-amt-block pm-amt-block--net">
            <span className="pm-amt-label">Net Pay</span>
            <span className="pm-amt-value">{formatInr(item.netSalary)}</span>
          </div>
        </div>

        <span className={`pm-status-badge ${statusConfig.cls}`}>{statusConfig.label}</span>

        <button
          className="pm-row-chevron"
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          type="button"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className="pm-row-detail">
          <div className="pm-row-detail-info">
            <span><strong>Period:</strong> {item.month} {item.year}</span>
            <span><strong>Payable Days:</strong> {item.payableWorkingDays} / {item.totalDaysInMonth}</span>
            {isDaily && item.payrollDate && (
              <span><strong>Date:</strong> {new Date(item.payrollDate).toLocaleDateString("en-GB")}</span>
            )}
          </div>
          <div className="pm-row-detail-actions">
            <button className="pm-action-btn pm-action-btn--view" onClick={onViewBreakdown} type="button">
              <Eye size={14} /> Breakdown
            </button>
            {canAct && (
              <>
                <button className="pm-action-btn pm-action-btn--approve" onClick={onApprove} disabled={actionLoading} type="button">
                  <CheckCircle size={14} /> Approve
                </button>
                <button className="pm-action-btn pm-action-btn--delete" onClick={onDelete} disabled={actionLoading} type="button">
                  <XCircle size={14} /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
