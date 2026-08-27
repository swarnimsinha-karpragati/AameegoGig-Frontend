import { useEffect, useRef, useState, useCallback } from "react";
import { searchEmployees } from "../../services/employeeService";
import "./SearchableEmployeeSelect.css";

function SearchableEmployeeSelectServer({
  value,
  onChange,
  disabled = false,
  hasError = false,
  placeholder = "-- Select Employee --",
  controlClassName = "month-mark-control",
  departmentId,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchEmployees = useCallback(async (term) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchEmployees({
          search: term,
          departmentId,
          limit: 50,
        });
        const fetchedList = res.data.employees || [];
        setEmployees(fetchedList);
        if (value) {
          const match = fetchedList.find((e) => e._id === value);
          if (match) {
            setSelectedEmployee(match);
          }
        }
      } catch (err) {
        console.error("Employee search error:", err);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    }, 200);
  }, [departmentId, value]);

  useEffect(() => {
    if (value) {
      fetchEmployees("");
    } else {
      setSelectedEmployee(null);
      setSearchTerm("");
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    fetchEmployees(term);
  };

  const handleSelect = (emp) => {
    setSelectedEmployee(emp);
    setSearchTerm(`${emp.employeeCode} - ${emp.name}`);
    onChange(emp._id);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedEmployee(null);
    setSearchTerm("");
    onChange("");
  };

  return (
    <div className="month-mark-combobox" ref={dropdownRef}>
      <div
        className={`${controlClassName} month-mark-combobox__trigger ${hasError ? "month-mark-control--error" : ""
          } ${disabled ? "month-mark-control--disabled" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
      >
        <span className={selectedEmployee ? "month-mark-combobox__value" : "month-mark-combobox__placeholder"}>
          {selectedEmployee
            ? `${selectedEmployee.employeeCode} - ${selectedEmployee.name}`
            : placeholder}
        </span>
        {selectedEmployee && !disabled && (
          <button
            type="button"
            className="month-mark-combobox__clear"
            onClick={handleClear}
          >
            ×
          </button>
        )}
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
              onChange={handleSearch}
              autoFocus
            />
          </div>

          <ul className="month-mark-combobox__list">
            {loading ? (
              <li className="month-mark-combobox__no-results">Loading...</li>
            ) : employees.length > 0 ? (
              employees.map((emp) => (
                <li
                  key={emp._id}
                  className={`month-mark-combobox__item ${emp._id === value ? "month-mark-combobox__item--selected" : ""
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

export default SearchableEmployeeSelectServer;