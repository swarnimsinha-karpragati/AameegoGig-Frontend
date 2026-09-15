/* eslint-disable no-undef */
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Calculator, CheckCircle, XCircle, RefreshCw, Eye, ChevronDown, ChevronUp,
  Search, Calendar, Users, Zap, FileText, TrendingUp,
} from "lucide-react";
import { getAvailableMonths, PAYROLL_YEARS, formatInr } from "../../utils/payrollConstants";
import Button from "../Button";
import MonthYearFilter from "./MonthYearFilter";
import PayrollListToolbar from "./PayrollListToolbar";
import Pagination from "../Pagination";

/** Local (browser-timezone) today as YYYY-MM-DD — avoids the UTC shift of toISOString(). */
const todayLocalISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export default function PayrollManager(props) {
  const {
    employees,
    payrolls,
    payrollSummary,
    listLoading,
    searchQuery,
    reviewFilter,
    pagination,
    actionLoading,
    listMonth,
    listYear,
    onListMonthChange,
    onListYearChange,
    calcMonth,
    calcYear,
    onCalcMonthChange,
    onCalcYearChange,
    onSearchChange,
    onReviewFilterChange,
    onPageChange,
    onPageSizeChange,
    onPreview,
    onCalculateSingle,
    onBulkCalculate,
    onApproveSingle,
    onDeleteSingle,
    onBulkApprove,
    onViewBreakdown,
  } = props;

  const [payrollType, setPayrollType] = useState("monthly");
  const [selectedEmp, setSelectedEmp] = useState(null); // { id, code, name, phone }
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [comment, setComment] = useState("");
  const [payrollDate, setPayrollDate] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const empWrapRef = useRef(null);
  const empSearchRef = useRef(null);

  const pendingPayrolls = useMemo(
    () => payrolls.filter((p) => p.approvalStatus !== "Approved" && p.status !== "Processed"),
    [payrolls]
  );

  const stats = useMemo(
    () => ({
      totalGross: payrollSummary?.totalGross || 0,
      totalDeductions: payrollSummary?.totalDeductions || 0,
      totalNet: payrollSummary?.totalNet || 0,
      total: payrollSummary?.total || 0,
      pending: payrollSummary?.pending || 0,
      approved: payrollSummary?.approved || 0,
    }),
    [payrollSummary]
  );

  const eligibleEmployees = useMemo(() => {
    const monthStart = new Date(calcYear, calcMonth - 1, 1);
    return employees.filter((e) => {
      if (!e.ctcStructureId) return false;
      if (e.relievingDate) {
        const rd = new Date(e.relievingDate);
        if (!Number.isNaN(rd.getTime()) && rd < monthStart) return false;
      }
      return true;
    });
  }, [employees, calcMonth, calcYear]);

  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    if (!q) return eligibleEmployees;
    const phoneDigits = q.replace(/\D/g, "");
    return eligibleEmployees.filter((e) => {
      const nameMatch = e.name?.toLowerCase().includes(q);
      const codeMatch = e.employeeCode?.toLowerCase().includes(q);
      const phoneMatch =
        phoneDigits.length >= 3 &&
        String(e.phone || "").replace(/\D/g, "").includes(phoneDigits);
      return nameMatch || codeMatch || phoneMatch;
    });
  }, [eligibleEmployees, empSearch]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (empWrapRef.current && !empWrapRef.current.contains(e.target)) {
        setEmpDropdownOpen(false);
        setEmpSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (empDropdownOpen) {
      // Focus search when opening the select
      requestAnimationFrame(() => empSearchRef.current?.focus());
    }
  }, [empDropdownOpen]);

  // Clear selection if employee no longer eligible for calc period
  useEffect(() => {
    if (!selectedEmp) return;
    const stillEligible = eligibleEmployees.some((e) => e._id === selectedEmp.id);
    if (!stillEligible) setSelectedEmp(null);
  }, [eligibleEmployees, selectedEmp]);

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
      const [year, month] = payrollDate.split("-").map(Number);
      return { month, year };
    }
    return { month: calcMonth, year: calcYear };
  };

  const handleBulkCalc = () => {
    const { month, year } = getPeriod();
    onBulkCalculate({
      payrollType,
      month,
      year,
      employeeIds: undefined,
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
    const { month, year } = getPeriod();
    onPreview({
      employeeId: selectedEmp.code,
      month,
      year,
      payrollType,
      payrollDate: payrollType === "daily" ? payrollDate : undefined,
    });
  };

  const handleCalculate = () => {
    if (!selectedEmp) return;
    const { month, year } = getPeriod();
    onCalculateSingle({
      employeeId: selectedEmp.id,
      month,
      year,
      payrollType,
      payrollDate: payrollType === "daily" ? payrollDate : undefined,
    });
  };

  const pickEmployee = (emp) => {
    setSelectedEmp({
      id: emp._id,
      code: emp.employeeCode,
      name: emp.name,
      phone: emp.phone || "",
    });
    setEmpSearch("");
    setEmpDropdownOpen(false);
  };

  const clearEmployee = (e) => {
    e.stopPropagation();
    setSelectedEmp(null);
    setEmpSearch("");
    setEmpDropdownOpen(true);
  };

  const dailyReady = payrollType !== "daily" || payrollDate;

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
            <span className="pm-stat-value">{stats.pending}</span>
          </div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-icon pm-stat-icon--green">
            <CheckCircle size={18} />
          </div>
          <div className="pm-stat-body">
            <span className="pm-stat-label">Approved</span>
            <span className="pm-stat-value">{stats.approved}</span>
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
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="pm-calc-title">Payroll Calculator</h3>
              <p className="pm-calc-subtitle">Pick period &amp; employee, then preview or calculate</p>
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
              Daily
            </button>
          </div>
        </div>

        <div className="pm-calc-body pm-calc-body--compact">
          <div className="pm-calc-grid">
            {/* Period */}
            {payrollType === "monthly" ? (
              <div className="pm-calc-field">
                <label className="pm-calc-label">Period</label>
                <div className="pm-calc-period-group">
                  <select
                    value={calcMonth}
                    onChange={(e) => onCalcMonthChange(parseInt(e.target.value, 10))}
                    className="pm-calc-select"
                    aria-label="Calculator month"
                  >
                    {getAvailableMonths(calcYear).map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={calcYear}
                    onChange={(e) => onCalcYearChange(parseInt(e.target.value, 10))}
                    className="pm-calc-select pm-calc-select--year"
                    aria-label="Calculator year"
                  >
                    {PAYROLL_YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="pm-calc-field">
                <label className="pm-calc-label">Payroll date</label>
                <input
                  type="date"
                  value={payrollDate}
                  onChange={(e) => setPayrollDate(e.target.value)}
                  className="pm-calc-select"
                  max={todayLocalISO()}
                />
              </div>
            )}

            {/* Employee searchable select */}
            <div className="pm-calc-field pm-calc-field--emp" ref={empWrapRef}>
              <label className="pm-calc-label">
                Employee
                <span className="pm-calc-label-meta">{eligibleEmployees.length} eligible</span>
              </label>
              <div className={`pm-emp-select ${empDropdownOpen ? "pm-emp-select--open" : ""}`}>
                <button
                  type="button"
                  className="pm-emp-select-trigger"
                  onClick={() => setEmpDropdownOpen((o) => !o)}
                  aria-haspopup="listbox"
                  aria-expanded={empDropdownOpen}
                >
                  {selectedEmp ? (
                    <span className="pm-emp-select-value">
                      <span className="pm-emp-select-code">{selectedEmp.code}</span>
                      <span className="pm-emp-select-name">{selectedEmp.name}</span>
                    </span>
                  ) : (
                    <span className="pm-emp-select-placeholder">Select employee…</span>
                  )}
                  <span className="pm-emp-select-actions">
                    {selectedEmp && (
                      <span
                        className="pm-emp-select-clear"
                        onClick={clearEmployee}
                        role="button"
                        tabIndex={-1}
                        aria-label="Clear employee"
                      >
                        ×
                      </span>
                    )}
                    <ChevronDown size={16} className={`pm-emp-chevron ${empDropdownOpen ? "open" : ""}`} />
                  </span>
                </button>

                {empDropdownOpen && (
                  <div className="pm-emp-select-panel" role="listbox">
                    <div className="pm-emp-select-search">
                      <Search size={14} />
                      <input
                        ref={empSearchRef}
                        type="text"
                        placeholder="Search code, name, or phone…"
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setEmpDropdownOpen(false);
                            setEmpSearch("");
                          }
                          if (e.key === "Enter" && filteredEmployees[0]) {
                            e.preventDefault();
                            pickEmployee(filteredEmployees[0]);
                          }
                        }}
                      />
                    </div>
                    <div className="pm-emp-select-list">
                      {filteredEmployees.length === 0 ? (
                        <div className="pm-emp-select-empty">
                          {eligibleEmployees.length === 0
                            ? "No eligible employees for this period"
                            : "No matches"}
                        </div>
                      ) : (
                        filteredEmployees.slice(0, 80).map((emp) => (
                          <button
                            key={emp._id}
                            type="button"
                            role="option"
                            aria-selected={selectedEmp?.id === emp._id}
                            className={`pm-emp-select-option ${selectedEmp?.id === emp._id ? "selected" : ""}`}
                            onClick={() => pickEmployee(emp)}
                          >
                            <span className="pm-emp-select-code">{emp.employeeCode}</span>
                            <span className="pm-emp-select-option-meta">
                              <span className="pm-emp-select-name">{emp.name}</span>
                              {emp.phone ? <span className="pm-emp-select-phone">{emp.phone}</span> : null}
                            </span>
                          </button>
                        ))
                      )}
                      {filteredEmployees.length > 80 && (
                        <div className="pm-emp-select-more">
                          +{filteredEmployees.length - 80} more — refine your search
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pm-calc-field pm-calc-field--actions">
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
                <Button
                  icon={<RefreshCw size={15} className={actionLoading ? "spin" : ""} />}
                  onClick={handleBulkCalc}
                  disabled={actionLoading || !dailyReady}
                  type="button"
                  title="Calculate payroll for all eligible employees in this period"
                >
                  Calculate All
                </Button>
              </div>
            </div>
          </div>

          {payrollType === "daily" && (
            <p className="pm-calc-foot-hint">
              <Zap size={12} /> Attendance must already be marked for the selected date.
            </p>
          )}
        </div>
      </div>

      {/* ── Records ── */}
      <div className="pm-records-card payroll-list-card">
        <div className="pm-records-header pm-records-header--toolbar">
          <div className="pm-records-header-left">
            <h4 className="pm-records-title">Payroll records</h4>
            <span className="pm-records-count">{pagination?.total ?? stats.total}</span>
          </div>
        </div>

        <PayrollListToolbar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          trailing={
            pendingPayrolls.length > 0 && reviewFilter !== "approved" ? (
              <div className="control-group payroll-filter-field">
                <label className="payroll-filter-label-spacer" aria-hidden>
                  &nbsp;
                </label>
                <label className="pm-check-toggle">
                  <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
                  <span>Select page</span>
                  {selectedEmpIds.length > 0 && (
                    <span className="pm-selected-pill">{selectedEmpIds.length}</span>
                  )}
                </label>
              </div>
            ) : null
          }
        >
          <MonthYearFilter
            compact
            month={listMonth}
            year={listYear}
            onMonthChange={onListMonthChange}
            onYearChange={onListYearChange}
          />
          <div className="control-group payroll-filter-field">
            <label>Status</label>
            <div className="pm-type-switch">
              {[
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "approved", label: "Approved" },
              ].map(({ id, label }) => (
                <Button
                  key={id}
                  type="button"
                  className={`generic-btn ${reviewFilter === id ? "active" : "not-active"}`}
                  onClick={() => onReviewFilterChange(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </PayrollListToolbar>

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
              Approve ({selectedEmpIds.length})
            </button>
          </div>
        )}

        {listLoading ? (
          <div className="pm-empty pm-empty--inline">
            <p className="pm-empty-desc">Loading payroll records…</p>
          </div>
        ) : payrolls.length === 0 ? (
          <div className="pm-empty pm-empty--inline">
            <div className="pm-empty-graphic">
              <Calculator size={40} strokeWidth={1} />
            </div>
            <h4 className="pm-empty-title">No payroll records</h4>
            <p className="pm-empty-desc">
              {searchQuery.trim()
                ? "Try a different search or clear filters."
                : "No records for this month — change the records period or run Calculate above."}
            </p>
          </div>
        ) : (
          <div className="pm-rows">
            {payrolls.map((item) => {
              const canAct = item.status !== "Processed" && item.approvalStatus !== "Approved";
              return (
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
                  showSelect={canAct && reviewFilter !== "approved"}
                />
              );
            })}
          </div>
        )}

        {pagination?.total > 0 && (
          <Pagination
            className="payroll-pagination"
            currentPage={pagination.page}
            totalPages={Math.max(pagination.pages, 1)}
            totalRecords={pagination.total}
            limit={pagination.limit}
            onPageChange={onPageChange}
            showPageSize
            onPageSizeChange={onPageSizeChange}
          />
        )}
      </div>
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
