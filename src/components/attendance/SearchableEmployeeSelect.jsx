import { useEffect, useMemo, useRef, useState } from "react";
import "./SearchableEmployeeSelect.css";

function SearchableEmployeeSelect({
  employeeList = [],
  value,
  onChange,
  disabled = false,
  hasError = false,
  placeholder = "-- Select Employee --",
  controlClassName = "month-mark-control",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  const selectedEmployee = employeeList.find((emp) => emp._id === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employeeList;
    const term = searchTerm.toLowerCase();
    return employeeList.filter((emp) => {
      const codeMatch = emp.employeeCode?.toLowerCase().includes(term);
      const nameMatch = emp.name?.toLowerCase().includes(term);
      return codeMatch || nameMatch;
    });
  }, [employeeList, searchTerm]);

  const handleSelect = (empId) => {
    onChange(empId);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="month-mark-combobox" ref={dropdownRef}>
      <div
        className={`${controlClassName} month-mark-combobox__trigger ${
          hasError ? "month-mark-control--error" : ""
        } ${disabled ? "month-mark-control--disabled" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
      >
        <span className={selectedEmployee ? "month-mark-combobox__value" : "month-mark-combobox__placeholder"}>
          {selectedEmployee
            ? `${selectedEmployee.employeeCode} - ${selectedEmployee.name}`
            : placeholder}
        </span>
        <span className="month-mark-combobox__arrow">{isOpen ? "▲" : "▼"}</span>
      </div>

      {isOpen && !disabled && (
        <div className="month-mark-combobox__dropdown">
          <div className="month-mark-combobox__search-wrap">
            <input
              type="text"
              className="month-mark-combobox__search-input"
              placeholder="Search by ID or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <ul className="month-mark-combobox__list">
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => (
                <li
                  key={emp._id}
                  className={`month-mark-combobox__item ${
                    emp._id === value ? "month-mark-combobox__item--selected" : ""
                  }`}
                  onClick={() => handleSelect(emp._id)}
                >
                  <span className="month-mark-combobox__item-code">{emp.employeeCode}</span>
                  <span className="month-mark-combobox__item-name">{emp.name}</span>
                </li>
              ))
            ) : (
              <li className="month-mark-combobox__no-results">No employees found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SearchableEmployeeSelect;
