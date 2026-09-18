import React from "react";
import { Search } from "lucide-react";

export default function PayrollListToolbar({
  searchQuery,
  onSearchChange,
  placeholder = "Search by code, name, or phone…",
  children,
  trailing,
  searchLabel = "Search",
}) {
  return (
    <div className="payroll-list-toolbar">
      <div className="payroll-list-toolbar-main">
        {children}
        <div className="control-group payroll-filter-field payroll-filter-field--search">
          <label htmlFor="payroll-list-search">{searchLabel}</label>
          <div className="table-search-bar payroll-search-bar">
            <Search size={16} aria-hidden />
            <input
              id="payroll-list-search"
              type="search"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search payroll records"
            />
          </div>
        </div>
      </div>
      {trailing ? <div className="payroll-list-toolbar-trailing">{trailing}</div> : null}
    </div>
  );
}
