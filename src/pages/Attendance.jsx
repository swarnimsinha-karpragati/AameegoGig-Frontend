import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  UserCheck,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  ClipboardCheck,
  Check,
  AlertCircle,
  Upload,
  X,
} from "lucide-react";
import "./Attendance.css";
import MainLayout from "../layouts/MainLayout";
import ConfirmModal from "../components/ConfirmModal";
import { ToastProvider, useToast } from "../components/Toast";
import Pagination from "../components/Pagination";
import SelfieCapture from "../components/SelfieCapture";
import Button from "../components/Button";
import { getEmployees } from "../services/employeeService";
import {
  getMonthlyAttendance,
  getAttendanceList,
  markAttendance,
  checkInAttendance,
  checkOutAttendance,
  getCheckInSelfieUrl,
  buildTodayRowFromAttendanceResponse,
  markMonthAttendance,
  bulkUploadMonthAttendance,
} from "../services/attendanceService";
import {
  getAttendanceViewKey,
  getStoredUser,
  hasLinkedEmployeeProfile,
} from "../utils/roles";
import { formatGeoLocation, getAttendanceLocation } from "../utils/geolocation";
import SearchableEmployeeSelectServer from "../components/attendance/SearchableEmployeeSelectServer";
import AttendanceStats from "../components/attendance/AttendanceStats";
import TodayMetricsGrid from "../components/attendance/TodayMetricsGrid";
import SessionList from "../components/attendance/SessionList";
import AttendanceCalendar from "../components/attendance/AttendanceCalendar";
import TodayAttendanceTable from "../components/attendance/TodayAttendanceTable";
import {
  normalizeRecord,
  ROLE_DESCRIPTIONS,
  statusTextClass,
  EMPTY_STATS,
  EMPTY_MY_ROW,
  FILTER_LABELS,
} from "../components/attendance/attendanceUtils";
import MonthlyAttendanceReport from "../components/MonthlyAttendanceReport";

function Attendance() {
  const user = getStoredUser();
  const viewRole = getAttendanceViewKey(user?.role);
  const [personalViewDate, setPersonalViewDate] = useState(() => new Date());
  const [orgViewDate, setOrgViewDate] = useState(() => new Date());
  const [selectedPersonalDay, setSelectedPersonalDay] = useState(null);
  const [selectedOrgDay, setSelectedOrgDay] = useState(null);
  const [selfCalendar, setSelfCalendar] = useState({
    calendar: {},
    holidays: {},
    weekOffs: {},
    dayRecords: {},
  });
  const [orgCalendar, setOrgCalendar] = useState({
    calendar: {},
    holidays: {},
    weekOffs: {},
    dayRecords: {},
  });
  const [selfRows, setSelfRows] = useState([]);
  const [selfStats, setSelfStats] = useState(EMPTY_STATS);
  const [orgRows, setOrgRows] = useState([]);
  const [orgStats, setOrgStats] = useState(EMPTY_STATS);
  const [teamRows, setTeamRows] = useState([]);
  const [todaySelfRow, setTodaySelfRow] = useState(EMPTY_MY_ROW);
  const [hasTeam, setHasTeam] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [attendanceAction, setAttendanceAction] = useState("checkin");
  const [checkInMessage, setCheckInMessage] = useState("");
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [showMonthlyUploadModal, setShowMonthlyUploadModal] = useState(false);
  const [monthlyUploadFile, setMonthlyUploadFile] = useState(null);
  const [monthlyUploadLoading, setMonthlyUploadLoading] = useState(false);
  const [monthlyUploadResult, setMonthlyUploadResult] = useState(null);
  const [monthlyUploadDragActive, setMonthlyUploadDragActive] = useState(false);
  const monthlyUploadInputRef = useRef(null);

  const createInitialFilters = () => ({
    filterType: "today",
    search: "",
    startDate: "",
    endDate: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });


  const [selfFilters, setSelfFilters] = useState(createInitialFilters);
  const [orgFilters, setOrgFilters] = useState(createInitialFilters);
  const [teamFilters, setTeamFilters] = useState(createInitialFilters);

  const [selfPagination, setSelfPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [orgPagination, setOrgPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [teamPagination, setTeamPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  const [markForm, setMarkForm] = useState({
    employeeId: "",
    status: "Present",
    checkIn: "",
    checkOut: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [modal, setModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    variant: "danger",
    onConfirm: null,
  });

  const toast = useToast();
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const canMarkForOthers = user?.role === "Admin" || user?.role === "HR";
  const canSelfCheckIn = hasLinkedEmployeeProfile(user);

  const personalMonthLabel = personalViewDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const orgMonthLabel = orgViewDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const buildListParams = (target, viewDateObj, selectedDay, filterObj, pagination) => {
    const params = {
      target,
      filterType: filterObj.filterType,
      search: filterObj.search || "",
      page: pagination.page,
      limit: pagination.limit,
    };
    if (selectedDay !== null) {
      params.filterType = "custom";
      const dayStr = `${viewDateObj.getFullYear()}-${String(
        viewDateObj.getMonth() + 1
      ).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      params.startDate = dayStr;
      params.endDate = dayStr;
    } else if (filterObj.startDate && filterObj.endDate) {
      params.startDate = filterObj.startDate;
      params.endDate = filterObj.endDate;
    } else {
      params.startDate = "";
      params.endDate = "";
    }
    return params;
  };

  const applyTodayRowUpdate = (response) => {
    if (!user?.employeeId) return;

    const nextRow = buildTodayRowFromAttendanceResponse(response, user);
    setTodaySelfRow(nextRow);
    setSelfRows((prev) => [
      ...prev.filter(
        (row) =>
          String(row.employeeId?._id || row.employeeId) !==
          String(user.employeeId)
      ),
      nextRow,
    ]);
  };

  const loadSelfData = async () => {
    if (viewRole === "Organization") return;
    try {
      const year = personalViewDate.getFullYear();
      const month = personalViewDate.getMonth() + 1;
      const params = buildListParams("self", personalViewDate, selectedPersonalDay, selfFilters, selfPagination);
      const [monthData, listRes] = await Promise.all([
        getMonthlyAttendance(year, month, "self"),
        getAttendanceList(params),
      ]);

      setSelfCalendar({
        calendar: monthData.calendar || {},
        holidays: monthData.holidays || {},
        weekOffs: monthData.weekOffs || {},
        dayRecords: monthData.dayRecords || {},
      });
      setSelfStats(monthData.stats || EMPTY_STATS);
      setSelfRows(listRes.rows || []);
      if (listRes.pagination) {
        setSelfPagination(prev => ({ ...prev, total: listRes.pagination.total, pages: listRes.pagination.pages }));
      }
      if (listRes.hasTeam !== undefined) setHasTeam(listRes.hasTeam);
    } catch (err) {
      if (err.response?.status === 403) return;
      setError(err.response?.data?.message || "Failed to load attendance data");
    }
  };

  const loadOrgData = async () => {
    if (!canMarkForOthers) return;
    try {
      const year = orgViewDate.getFullYear();
      const month = orgViewDate.getMonth() + 1;
      const params = buildListParams("org", orgViewDate, selectedOrgDay, orgFilters, orgPagination);
      const [monthData, listRes] = await Promise.all([
        getMonthlyAttendance(year, month, "org"),
        getAttendanceList(params),
      ]);

      setOrgCalendar({
        calendar: monthData.calendar || {},
        holidays: monthData.holidays || {},
        weekOffs: monthData.weekOffs || {},
        dayRecords: monthData.dayRecords || {},
      });
      setOrgStats(monthData.stats || EMPTY_STATS);
      setOrgRows(listRes.rows || []);
      if (listRes.pagination) {
        setOrgPagination(prev => ({ ...prev, total: listRes.pagination.total, pages: listRes.pagination.pages }));
      }
    } catch (err) {
      if (err.response?.status === 403) return;
      setError(err.response?.data?.message || "Failed to load attendance data");
    }
  };

  const loadTeamData = async () => {
    if (!hasTeam) return;
    try {
      const params = buildListParams("team", personalViewDate, null, teamFilters, teamPagination);
      const listRes = await getAttendanceList(params);
      setTeamRows(listRes.rows || []);
      if (listRes.pagination) {
        setTeamPagination(prev => ({ ...prev, total: listRes.pagination.total, pages: listRes.pagination.pages }));
      }
    } catch (err) {
      if (err.response?.status === 403) return;
      setError(err.response?.data?.message || "Failed to load team attendance");
    }
  };

  const loadTodaySelf = async () => {
    if (!canSelfCheckIn) return;
    try {
      const listRes = await getAttendanceList({
        target: "self",
        filterType: "today",
      });
      const mine = (listRes.rows || []).find(
        (row) =>
          (user?.employeeId &&
            String(row.employeeId?._id || row.employeeId) ===
            String(user.employeeId)) ||
          row.name?.toLowerCase() === user?.name?.toLowerCase()
      );
      setTodaySelfRow(mine ? { ...EMPTY_MY_ROW, ...mine } : EMPTY_MY_ROW);
    } catch (err) {
      if (err.response?.status === 403) return;
    }
  };

  const loadEmployees = async () => {
    if (!canMarkForOthers) return;
    try {
      const res = await getEmployees();
      const list = res.data?.employees || [];
      setEmployees(list);
      if ((!markForm.employeeId || !markMonthForm.employeeId) && list.length > 0) {
        setMarkForm((prev) => ({ ...prev, employeeId: list[0]._id }));
        setMarkMonthForm((prev) => ({ ...prev, employeeId: list[0]._id }));
      }
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadSelfData(), loadOrgData(), loadTeamData()])
      .catch(() => { })
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [personalViewDate, selectedPersonalDay, orgViewDate, selectedOrgDay, selfFilters, orgFilters, teamFilters, hasTeam]);

  useEffect(() => {
    loadTodaySelf();
    // eslint-disable-next-line
  }, [user?.role]);

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line
  }, [user?.role]);

  const applyFilterUpdate = (key, value) => {
    if (key === "clearDates") {
      return { startDate: "", endDate: "", filterType: "today" };
    }

    if (key === "startDate" || key === "endDate") {
      return { [key]: value, filterType: "custom" };
    }

    if (key === "filterType") {
      return { filterType: value, startDate: "", endDate: "" };
    }

    return { [key]: value };
  };

  const handleSelfFilterChange = (key, value) => {
    if (key !== "search") {
      setSelectedPersonalDay(null);
    }
    setSelfFilters((prev) => ({ ...prev, ...applyFilterUpdate(key, value) }));
  };

  const handleOrgFilterChange = (key, value) => {
    if (key !== "search") {
      setSelectedOrgDay(null);
    }
    setOrgFilters((prev) => ({ ...prev, ...applyFilterUpdate(key, value) }));
  };

  const handleTeamFilterChange = (key, value) => {
    setTeamFilters((prev) => ({ ...prev, ...applyFilterUpdate(key, value) }));
  };

  const handlePersonalDaySelect = (day) => {
    setSelectedPersonalDay((prev) => (prev === day ? null : day));
  };

  const handleOrgDaySelect = (day) => {
    setSelectedOrgDay((prev) => (prev === day ? null : day));
  };

  const buildCalendarCells = (viewDateObj, calendarData) => {
    const year = viewDateObj.getFullYear();
    const month = viewDateObj.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const cells = [];
    const dayRecords = calendarData.dayRecords || {};

    for (let i = 0; i < firstDay; i += 1) {
      cells.push({ key: `empty-${i}`, empty: true });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const isToday =
        year === today.getFullYear() &&
        month === today.getMonth() &&
        day === today.getDate();
      const dayEntries = dayRecords[day] || dayRecords[String(day)] || [];
      const sessionCount = dayEntries.reduce(
        (sum, entry) => sum + (entry.sessionCount || entry.sessions?.length || 0),
        0
      );
      const leaveEntry = dayEntries.find((entry) => entry.status === "Leave");
      const wfhEntry = dayEntries.find((entry) => entry.status === "WFH");

      cells.push({
        key: `day-${day}`,
        day,
        status: calendarData.calendar[day] || "neutral",
        holiday: calendarData.holidays[day] || null,
        weekOff: !calendarData.holidays[day] ? calendarData.weekOffs[day] || null : null,
        isToday,
        hasSessions: sessionCount > 0,
        sessionCount,
        leave: leaveEntry ? leaveEntry.leaveType || "Leave" : null,
        wfh: wfhEntry ? true : null,
      });
    }

    return cells;
  };

  const personalCalendarDays = useMemo(
    () => buildCalendarCells(personalViewDate, selfCalendar),
    [personalViewDate, selfCalendar]
  );

  const orgCalendarDays = useMemo(
    () => buildCalendarCells(orgViewDate, orgCalendar),
    [orgViewDate, orgCalendar]
  );

  const myTodayRow = useMemo(() => {
    if (!todaySelfRow || Object.keys(todaySelfRow).length === 0) return EMPTY_MY_ROW;
    return {
      ...EMPTY_MY_ROW,
      ...todaySelfRow,
      id: todaySelfRow.id || user?.employeeId?.slice?.(-6)?.toUpperCase?.() || "—",
      name: todaySelfRow.name || user?.name || "You",
      initials:
        todaySelfRow.initials ||
        (user?.name || "YO")
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
    };
  }, [todaySelfRow, user]);

  const displayedPersonalRows = useMemo(
    () => selfRows.map((r) => normalizeRecord(r)),
    [selfRows]
  );

  const displayedOrgRows = useMemo(
    () => orgRows.map((r) => normalizeRecord(r)),
    [orgRows]
  );

  const displayedTeamRows = useMemo(
    () => teamRows.map((r) => normalizeRecord(r)),
    [teamRows]
  );

  const myLatestCheckInSelfieUrl = useMemo(() => {
    const sessions = myTodayRow.sessions || [];
    for (let i = sessions.length - 1; i >= 0; i -= 1) {
      if (sessions[i]?.checkInSelfieUrl) {
        return getCheckInSelfieUrl(sessions[i].checkInSelfieUrl);
      }
    }
    return null;
  }, [myTodayRow]);

  const myLatestCheckOutSelfieUrl = useMemo(() => {
    const sessions = myTodayRow.sessions || [];
    for (let i = sessions.length - 1; i >= 0; i -= 1) {
      if (sessions[i]?.checkOutSelfieUrl) {
        return getCheckInSelfieUrl(sessions[i].checkOutSelfieUrl);
      }
    }
    return null;
  }, [myTodayRow]);

  const myLatestCheckInLocation = useMemo(() => {
    const sessions = myTodayRow.sessions || [];
    for (let i = sessions.length - 1; i >= 0; i -= 1) {
      if (sessions[i]?.checkInLocation) {
        return formatGeoLocation(sessions[i].checkInLocation);
      }
    }
    return null;
  }, [myTodayRow]);

  const shiftPersonalMonth = (delta) => {
    const newDate = new Date(
      personalViewDate.getFullYear(),
      personalViewDate.getMonth() + delta,
      1
    );
    setPersonalViewDate(newDate);
    setSelectedPersonalDay(null);
  };

  const shiftOrgMonth = (delta) => {
    const newDate = new Date(
      orgViewDate.getFullYear(),
      orgViewDate.getMonth() + delta,
      1
    );
    setOrgViewDate(newDate);
    setSelectedOrgDay(null);
  };

  const formatTimeForApi = (time24) => {
    if (!time24) return "";
    const [hourStr, minuteStr] = time24.split(":");
    let hours = Number(hourStr);
    const meridiem = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${minuteStr} ${meridiem}`;
  };

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const [markMonthForm, setMarkMonthForm] = useState({
    employeeId: '',
    month: MONTHS[new Date().getMonth()],
    totalWorkingDays: '',
    // paidDays: '',
    incentiveDays: '0',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMonthMarkChange = (field, value) => {
    setMarkMonthForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!markMonthForm.employeeId) {
      newErrors.employeeId = 'Please select an employee.';
    }

    if (!markMonthForm.month) {
      newErrors.month = 'Please select an attendance month.';
    }

    const validateDays = (field, label, { integer = false, required = false } = {}) => {
      const value = markMonthForm[field];
      const days = Number(value);
      if (required && (value === '' || value === null || value === undefined)) {
        newErrors[field] = `${label} is required.`;
      } else if (value !== '' && (!Number.isFinite(days) || days < 0 || days > 31)) {
        newErrors[field] = `${label} must be between 0 and 31.`;
      } else if (value !== '' && integer && !Number.isInteger(days)) {
        newErrors[field] = `${label} must be a whole number.`;
      }
    };

    validateDays('totalWorkingDays', 'Total working days', { integer: true, required: true });
    validateDays('incentiveDays', 'Incentive days');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleMarkMonthAttendance = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await markMonthAttendance(markMonthForm);
      alert(res.message);
      setMarkMonthForm((prev) => ({
        ...prev,
        totalWorkingDays: '',
        paidDays: '',
        incentiveDays: '0',
      }));
      setErrors({});
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to submit attendance. Please try again.';

      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMonthlyBulkUpload = async () => {
    if (!monthlyUploadFile) {
      setMonthlyUploadResult({ errors: [{ message: "Please select an Excel (.xlsx or .xls) file." }] });
      return;
    }

    setMonthlyUploadLoading(true);
    setMonthlyUploadResult(null);
    try {
      const result = await bulkUploadMonthAttendance(monthlyUploadFile);
      setMonthlyUploadResult(result);
      if (result.uploaded > 0) {
        loadSelfData();
        loadOrgData();
      }
    } catch (uploadError) {
      setMonthlyUploadResult({
        errors: [{ message: uploadError.response?.data?.message || "Monthly attendance upload failed." }],
      });
    } finally {
      clearMonthlyUploadFile();
      setMonthlyUploadLoading(false);
    }
  };

  const clearMonthlyUploadFile = () => {
    setMonthlyUploadFile(null);
    if (monthlyUploadInputRef.current) monthlyUploadInputRef.current.value = "";
  };

  const setMonthlyUploadFileSafely = (file) => {
    setMonthlyUploadResult(null);
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setMonthlyUploadFile(null);
      setMonthlyUploadResult({ errors: [{ message: "Invalid file type. Please upload an .xlsx or .xls file." }] });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMonthlyUploadFile(null);
      setMonthlyUploadResult({ errors: [{ message: "File size exceeds the 5 MB limit." }] });
      return;
    }
    setMonthlyUploadFile(file);
  };

  const handleMonthlyUploadDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setMonthlyUploadDragActive(event.type === "dragenter" || event.type === "dragover");
  };

  const handleMonthlyUploadDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setMonthlyUploadDragActive(false);
    setMonthlyUploadFileSafely(event.dataTransfer.files?.[0]);
  };

  const downloadMonthlyUploadTemplate = () => {
    const rows = [
      ["INSTRUCTIONS FOR MONTHLY ATTENDANCE BULK UPLOAD"],
      ["1. Employee Code (Required): Use the exact employee code, e.g. GRV-0026."],
      ["2. Month and Year (Required): Use full month name, e.g. August, and a four-digit year."],
      ["3. Total Working Days (Required): Total Working Days must be a whole number"],
      ["4. Incentive Days and Notes (Optional): Incentive Days can include 0.5. Leave it blank to use 0."],
      [],
      ["Employee Code", "Month", "Year", "Total Working Days", "Incentive Days", "Notes"],
      ["GRV-0026", "August", 2026, 22, 0, "Monthly attendance upload"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 18 }, { wch: 15 }, { wch: 10 }, { wch: 22 },
      { wch: 14 }, { wch: 18 }, { wch: 32 },
    ];
    worksheet["!merges"] = [0, 1, 2, 3, 4].map((row) => ({ s: { r: row, c: 0 }, e: { r: row, c: 6 } }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Attendance");
    XLSX.writeFile(workbook, "monthly-attendance-bulk-upload-template.xlsx");
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();

    if (!markForm.employeeId) {
      toast.warning("Please select an employee");
      return;
    }

    if (markForm.checkIn && markForm.checkOut) {
      const timeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const checkInMinutes = timeToMinutes(markForm.checkIn);
      const checkOutMinutes = timeToMinutes(markForm.checkOut);

      if (checkOutMinutes <= checkInMinutes) {
        toast.warning("Check-out time must be later than Check-in time.");
        return;
      }
    }

    try {
      await markAttendance({
        ...markForm,
        checkIn: markForm.checkIn ? formatTimeForApi(markForm.checkIn) : "",
        checkOut: markForm.checkOut ? formatTimeForApi(markForm.checkOut) : "",
        date: markForm.date || new Date().toISOString().split("T")[0],
      });
      toast.success("Attendance saved successfully");
      loadOrgData();
      loadSelfData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to save attendance");
    }
  };

  const handleCheckIn = () => {
    setCheckInMessage("");
    setAttendanceAction("checkin");
    setShowSelfieModal(true);
  };

  const handleSelfieCapture = async (payload) => {
    setCheckInSubmitting(true);
    setActionLoading(true);

    try {
      const selfieBlob = payload?.blob || payload;
      const directLocation = payload?.location;
      setCheckInMessage("Detecting your location...");
      let location = directLocation;
      if (!location) {
        location = await getAttendanceLocation(
          attendanceAction === "checkin" ? "check in" : "check out"
        );
      }

      let res;
      if (attendanceAction === "checkin") {
        res = await checkInAttendance(selfieBlob, location);
      } else {
        res = await checkOutAttendance(selfieBlob, location);
      }

      const successMsg =
        res?.message ||
        (attendanceAction === "checkin"
          ? "Checked in successfully!"
          : "Checked out successfully!");

      setCheckInMessage(successMsg);
      alert(successMsg);

      applyTodayRowUpdate(res);
      setShowSelfieModal(false);
      await loadTodaySelf();
      await loadSelfData();
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to process attendance. Please try again.";

      setCheckInMessage(errorMsg);
      alert(`Error: ${errorMsg}`);
    } finally {
      setActionLoading(false);
      setCheckInSubmitting(false);
    }
  };

  const handleCheckOut = () => {
    setCheckInMessage("");
    setAttendanceAction("checkout");
    setShowSelfieModal(true);
  };

  const [isReportModalOpen,setIsReportModalOpen] = useState(false)

  const handleReportModal = () => {
    setIsReportModalOpen(true);
  }

  const handleReportModalClose = () => {
    setIsReportModalOpen(false);
  }

  const renderCalendarSection = ({ title, viewDateObj, calendarDays, selectedDay, onDaySelect, onPrev, onNext, showLeaveWfh = true }) => (
    <AttendanceCalendar
      monthLabel={title}
      calendarDays={calendarDays}
      selectedDay={selectedDay}
      onDaySelect={onDaySelect}
      onPrev={onPrev}
      onNext={onNext}
      showLeaveWfh={showLeaveWfh}
    />
  );

  const renderSelfAttendanceSection = (title = "My Check In / Out") => {
    if (!canSelfCheckIn) {
      return (
        <section className="attendance-checkin-card attendance-link-notice">
          <h2>{title}</h2>
          <p className="attendance-sessions-empty">
            Link your user account to an employee profile to check in, check out,
            and track your personal attendance sessions.
          </p>
        </section>
      );
    }

    return (
      <section className="attendance-checkin-card attendance-checkin-card--hero">
        <div className="attendance-checkin-hero">
          <div className="attendance-checkin-hero-text">
            <span className="attendance-checkin-date">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
            <h2>{title}</h2>
            <p className="attendance-checkin-subtitle">
              Selfie and location are required for check-in; location is also required for check-out.
            </p>
          </div>
          <span
            className={`attendance-status-pill ${myTodayRow.isCheckedIn
              ? "live"
              : statusTextClass[myTodayRow.status]?.replace("status-text-", "") || "absent"
              }`}
          >
            {myTodayRow.isCheckedIn ? "● Checked In" : myTodayRow.status}
          </span>
        </div>

        <TodayMetricsGrid
          metrics={[
            { key: "in", label: "First In", value: myTodayRow.checkIn, icon: LogIn, accent: "accent-green" },
            { key: "out", label: "Last Out", value: myTodayRow.isCheckedIn ? "—" : myTodayRow.checkOut, icon: LogOut, accent: "accent-slate" },
            { key: "hours", label: "Total Hours", value: myTodayRow.hours, icon: Clock, accent: "accent-blue" },
            { key: "sessions", label: "Sessions", value: myTodayRow.sessionCount || myTodayRow.sessions?.length || 0, icon: UserCheck, accent: "accent-violet" },
          ]}
        />

        <div className="attendance-checkin-actions attendance-checkin-actions--center">
          <Button
            type="button"
            icon={<LogIn size={18} />}
            onClick={handleCheckIn}
            disabled={actionLoading || myTodayRow.isCheckedIn}
          >
            {actionLoading ? "Processing..." : "Check In"}
          </Button>
          <Button
            type="button"
            className="secondary-btn"
            icon={<LogOut size={18} />}
            onClick={handleCheckOut}
            disabled={actionLoading || !myTodayRow.isCheckedIn}
          >
            {actionLoading ? "Processing..." : "Check Out"}
          </Button>
        </div>
        {checkInMessage ? <p className="attendance-save-msg">{checkInMessage}</p> : null}
        {myLatestCheckInSelfieUrl ||
          myLatestCheckOutSelfieUrl ||
          myLatestCheckInLocation ? (
          <div className="attendance-checkin-proof">
            {myLatestCheckInSelfieUrl ? (
              <div className="attendance-checkin-selfie">
                <span className="attendance-checkin-label">
                  Latest check-in selfie
                </span>
                <img
                  src={myLatestCheckInSelfieUrl}
                  alt="Latest check-in selfie"
                />
              </div>
            ) : null}
            {myLatestCheckOutSelfieUrl ? (
              <div className="attendance-checkin-selfie">
                <span className="attendance-checkin-label">
                  Latest check-out selfie
                </span>
                <img
                  src={myLatestCheckOutSelfieUrl}
                  alt="Latest check-out selfie"
                />
              </div>
            ) : null}
            {myLatestCheckInLocation ? (
              <div className="attendance-checkin-location">
                <span className="attendance-checkin-label">
                  Latest check-in location
                </span>
                <a
                  href={myLatestCheckInLocation.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="attendance-checkin-location-link"
                >
                  <MapPin size={16} />
                  <span>
                    {myLatestCheckInLocation.label}
                    {myLatestCheckInLocation.accuracy
                      ? ` (${myLatestCheckInLocation.accuracy})`
                      : ""}
                  </span>
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="attendance-today-sessions" style={{ marginTop: "1.5rem" }}>
          <div className="attendance-today-sessions-header">
            <h3>Today&apos;s Sessions</h3>
            <span className="attendance-today-sessions-count">
              {myTodayRow.sessionCount || myTodayRow.sessions?.length || 0} total
            </span>
          </div>
          <SessionList
            sessions={myTodayRow.sessions}
            totalHours={myTodayRow.hours}
            emptyMessage="No sessions yet. Tap Check In to start your first session."
          />
        </div>
      </section>
    );
  };

  const renderMarkForm = (employeeList, title) => (
    <section className="attendance-panel attendance-glass attendance-mark-card">
      <header className="attendance-panel__head attendance-mark-form__head">
        <div className="attendance-mark-form__title-wrap">
          <h2>
            <ClipboardCheck size={18} strokeWidth={2} />
            {title}
          </h2>
          <p className="attendance-mark-form__subtitle">
            Record or update attendance status, session times, and optional notes
          </p>
        </div>
      </header>
      <form className="attendance-mark-form" onSubmit={handleMarkAttendance}>
        <div className="attendance-mark-form__row">
          <div className="attendance-field attendance-field--employee">
            <label htmlFor="mark-employee">Employee</label>
            <SearchableEmployeeSelectServer
              value={markForm.employeeId}
              onChange={(empId) => setMarkForm((prev) => ({ ...prev, employeeId: empId }))}
              controlClassName="attendance-control"
            />
          </div>

          <div className="attendance-field attendance-field--status">
            <label htmlFor="mark-status">Status</label>
            <select
              id="mark-status"
              className={`attendance-control attendance-control--status attendance-control--status-${markForm.status.replace(/\s+/g, "-").toLowerCase()}`}
              value={markForm.status}
              onChange={(e) =>
                setMarkForm((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option>Present</option>
              <option>Absent</option>
              <option>Half Day</option>
              <option>Late</option>
              <option>WFH</option>
            </select>
          </div>
        </div>

        <div className="attendance-mark-form__row attendance-mark-form__row--details">
          <div className="attendance-field">
            <label htmlFor="mark-date">Date</label>
            <input
              id="mark-date"
              type="date"
              min={new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
                .toISOString()
                .split("T")[0]}
              className="attendance-control"
              max={new Date().toISOString().split("T")[0]}
              value={markForm.date}
              onChange={(e) =>
                setMarkForm((prev) => ({ ...prev, date: e.target.value }))
              }
            />
          </div>
          <div className="attendance-field">
            <label htmlFor="mark-check-in">Check In</label>
            <input
              id="mark-check-in"
              type="time"
              className="attendance-control"
              value={markForm.checkIn}
              onChange={(e) =>
                setMarkForm((prev) => ({ ...prev, checkIn: e.target.value }))
              }
              disabled={markForm?.status === "Absent"}
            />
          </div>

          <div className="attendance-field">
            <label htmlFor="mark-check-out">Check Out</label>
            <input
              id="mark-check-out"
              type="time"
              className="attendance-control"
              value={markForm.checkOut}
              onChange={(e) =>
                setMarkForm((prev) => ({ ...prev, checkOut: e.target.value }))
              }
              disabled={markForm?.status === "Absent"}
            />
          </div>

          <div className="attendance-field attendance-field--notes">
            <label htmlFor="mark-notes">Notes</label>
            <input
              id="mark-notes"
              type="text"
              className="attendance-control"
              placeholder="Optional notes for this entry"
              value={markForm.notes}
              onChange={(e) =>
                setMarkForm((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>
        </div>

        {markForm.status === "Absent" ? (
          <p className="attendance-mark-form__hint">
            Check-in and check-out times are not required when status is Absent.
          </p>
        ) : null}

        <div className="attendance-form-actions">
          <Button type="submit" icon={<Check size={16} />}>
            Save Attendance
          </Button>
        </div>
      </form>
    </section>
  );

  const renderMarkMonthForm = (employeeList, title) => (
    <section className="month-mark-card">
      <header className="month-mark-head">
        <div className="month-mark-title-wrap">
          <h2 className="month-mark-heading">
            <ClipboardCheck size={20} strokeWidth={2} />
            {title}
          </h2>
          <p className="month-mark-subtitle">
            Record or update monthly attendance status and working days summary
          </p>
        </div>
        <div className="month-mark-button-wrap">
          <Button
            className="secondary-btn"
            icon={<Upload size={16} />}
            onClick={() => {
              setMonthlyUploadResult(null);
              clearMonthlyUploadFile();
              setShowMonthlyUploadModal(true);
            }}
          >
            Bulk Upload
          </Button>
          <Button onClick={handleReportModal}>
            Download Report
          </Button>

        </div>
      </header>

      {errors.form && (
        <div className="month-mark-alert month-mark-alert--error" role="alert">
          <AlertCircle size={18} />
          <span>{errors.form}</span>
        </div>
      )}

      <form className="month-mark-form" onSubmit={handleMarkMonthAttendance} noValidate>
        <div className="month-mark-row">
          <div className={`month-mark-field ${errors.employeeId ? 'month-mark-field--error' : ''}`}>
            <label htmlFor="mark-employee" className="month-mark-label">
              Employee
            </label>
            <SearchableEmployeeSelectServer
              value={markMonthForm.employeeId}
              onChange={(empId) => handleMonthMarkChange('employeeId', empId)}
              disabled={isSubmitting}
              hasError={!!errors.employeeId}
            />
            {errors.employeeId && (
              <span className="month-mark-error-msg">{errors.employeeId}</span>
            )}
          </div>
        </div>

        <div className="month-mark-row month-mark-row--split">
          <div className={`month-mark-field ${errors.month ? 'month-mark-field--error' : ''}`}>
            <label htmlFor="attendance-month" className="month-mark-label">
              Attendance Month
            </label>
            <select
              id="attendance-month"
              className="month-mark-control"
              value={markMonthForm.month}
              onChange={(e) => handleMonthMarkChange('month', e.target.value)}
              disabled={isSubmitting}
            >
              {MONTHS
                .filter((_, index) => index <= new Date().getMonth())
                .map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
            </select>
            {errors.month && (
              <span className="month-mark-error-msg">{errors.month}</span>
            )}
          </div>

          <div className={`month-mark-field ${errors.totalWorkingDays ? 'month-mark-field--error' : ''}`}>
            <label htmlFor="working-days" className="month-mark-label">
              Total Working Days
            </label>
            <input
              id="working-days"
              type="number"
              min="0"
              max="31"
              placeholder="e.g., 22"
              className="month-mark-control"
              value={markMonthForm.totalWorkingDays}
              onChange={(e) => handleMonthMarkChange('totalWorkingDays', e.target.value)}
              disabled={isSubmitting}
            />
            {errors.totalWorkingDays && (
              <span className="month-mark-error-msg">{errors.totalWorkingDays}</span>
            )}
          </div>

          {/* <div className={`month-mark-field ${errors.paidDays ? 'month-mark-field--error' : ''}`}>
            <label htmlFor="paid-days" className="month-mark-label">Paid Days</label>
            <input
              id="paid-days"
              type="number"
              min="0"
              max="31"
              step="0.5"
              placeholder="e.g., 22"
              className="month-mark-control"
              value={markMonthForm.paidDays}
              onChange={(e) => handleMonthMarkChange('paidDays', e.target.value)}
              disabled={isSubmitting}
            />
            {errors.paidDays && <span className="month-mark-error-msg">{errors.paidDays}</span>}
          </div> */}

          <div className={`month-mark-field ${errors.incentiveDays ? 'month-mark-field--error' : ''}`}>
            <label htmlFor="incentive-days" className="month-mark-label">Incentive Days</label>
            <input
              id="incentive-days"
              type="number"
              min="0"
              max="31"
              step="0.5"
              className="month-mark-control"
              value={markMonthForm.incentiveDays}
              onChange={(e) => handleMonthMarkChange('incentiveDays', e.target.value)}
              disabled={isSubmitting}
            />
            {errors.incentiveDays && <span className="month-mark-error-msg">{errors.incentiveDays}</span>}
          </div>
        </div>

        <div className="month-mark-actions">
          <Button
            type="submit"
            className="month-mark-btn month-mark-btn--primary"
            disabled={isSubmitting}
            icon={<Check size={16} />}
          >
            {isSubmitting ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      </form>
    </section>
  );

  const getFilterDefaultTitle = (filterObj, base) =>
    FILTER_LABELS[filterObj.filterType] || base || "Attendance";

  const getTableTitle = (defaultTitle, selectedDay, viewDateObj, filterObj) => {
    if (selectedDay !== null && viewDateObj) {
      const targetDate = new Date(viewDateObj);
      targetDate.setDate(selectedDay);

      return `Attendance — ${targetDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    }
    if (filterObj.startDate && filterObj.endDate) {
      return `Attendance (${filterObj.startDate} to ${filterObj.endDate})`;
    }
    return defaultTitle;
  };

  const renderOrganizationView = () => (
    <>
      <AttendanceStats stats={orgStats} />
      {canMarkForOthers ? renderMarkForm(employees, "Mark Attendance") : null}
      {renderMarkMonthForm(employees, "Mark / Month Attendance")}
      {renderCalendarSection({
        title: `${orgMonthLabel} — Organization`,
        viewDateObj: orgViewDate,
        calendarDays: orgCalendarDays,
        selectedDay: selectedOrgDay,
        onDaySelect: handleOrgDaySelect,
        onPrev: () => shiftOrgMonth(-1),
        onNext: () => shiftOrgMonth(1),
        showLeaveWfh: false,
      })}
      <TodayAttendanceTable
        key={
          selectedOrgDay
            ? `org-day-${selectedOrgDay}`
            : `org-filter-${orgFilters.filterType}-${orgFilters.startDate}-${orgFilters.endDate}`
        }
        title={getTableTitle(
          `${getFilterDefaultTitle(orgFilters)} — All Employees`,
          selectedOrgDay,
          orgViewDate,
          orgFilters
        )}
        rows={displayedOrgRows}
        loading={loading}
        showActions
        target="org"
        downloadParams={buildListParams("org", orgViewDate, selectedOrgDay, orgFilters, { page: 1, limit: 10 })}
        filters={orgFilters}
        onFilterChange={handleOrgFilterChange}
        holiday={selectedOrgDay !== null ? orgCalendar.holidays[selectedOrgDay] : null}
        weekOff={selectedOrgDay !== null ? orgCalendar.weekOffs[selectedOrgDay] : null}
        isCalendarSelection={selectedOrgDay !== null}
        onClearSelectedDay={() => setSelectedOrgDay(null)}
      />

      {orgPagination.pages > 1 && (
        <Pagination
          currentPage={orgPagination.page}
          totalPages={orgPagination.pages}
          totalRecords={orgPagination.total}
          limit={orgPagination.limit}
          onPageChange={setPage => setOrgPagination(p => ({ ...p, page: setPage }))}
          showPageSize
          onPageSizeChange={limit => setOrgPagination(p => ({ ...p, limit, page: 1 }))}
        />
      )}
    </>
  );

  const renderHRView = () => (
    <>
      <AttendanceStats stats={selfStats} />
      {renderSelfAttendanceSection("My Check In / Out")}
      <div className="attendance-employee-secondary">
        {renderCalendarSection({
          title: `${personalMonthLabel} — My Calendar`,
          viewDateObj: personalViewDate,
          calendarDays: personalCalendarDays,
          selectedDay: selectedPersonalDay,
          onDaySelect: handlePersonalDaySelect,
          onPrev: () => shiftPersonalMonth(-1),
          onNext: () => shiftPersonalMonth(1),
        })}

      </div>
      <TodayAttendanceTable
        key={
          selectedPersonalDay
            ? `self-day-${selectedPersonalDay}`
            : `self-filter-${selfFilters.filterType}-${selfFilters.startDate}-${selfFilters.endDate}`
        }
        title={getTableTitle("My Attendance History", selectedPersonalDay, personalViewDate, selfFilters)}
        rows={displayedPersonalRows}
        loading={loading}
        target="self"
        downloadParams={buildListParams("self", personalViewDate, selectedPersonalDay, selfFilters, { page: 1, limit: 10 })}
        filters={selfFilters}
        onFilterChange={handleSelfFilterChange}
        holiday={selectedPersonalDay !== null ? selfCalendar.holidays[selectedPersonalDay] : null}
        weekOff={selectedPersonalDay !== null ? selfCalendar.weekOffs[selectedPersonalDay] : null}
        isCalendarSelection={selectedPersonalDay !== null}
        onClearSelectedDay={() => setSelectedPersonalDay(null)}
      />

      {selfPagination.pages > 1 && (
        <Pagination
          currentPage={selfPagination.page}
          totalPages={selfPagination.pages}
          totalRecords={selfPagination.total}
          limit={selfPagination.limit}
          onPageChange={setPage => setSelfPagination(p => ({ ...p, page: setPage }))}
          showPageSize
          onPageSizeChange={limit => setSelfPagination(p => ({ ...p, limit, page: 1 }))}
        />
      )}
      <h1 className="attendance-title">Organization Attendance</h1>
      {renderMarkForm(employees, "Mark / Correct Attendance")}
      {renderMarkMonthForm(employees, "Mark / Month Attendance")}

      <TodayAttendanceTable
        key={
          selectedOrgDay
            ? `org-day-${selectedOrgDay}`
            : `org-filter-${orgFilters.filterType}-${orgFilters.startDate}-${orgFilters.endDate}`
        }
        title={getTableTitle(
          `${getFilterDefaultTitle(orgFilters)} — All Employees`,
          selectedOrgDay,
          orgViewDate,
          orgFilters
        )}
        rows={displayedOrgRows}
        loading={loading}
        showActions
        target="org"
        downloadParams={buildListParams("org", orgViewDate, selectedOrgDay, orgFilters, { page: 1, limit: 10 })}
        filters={orgFilters}
        onFilterChange={handleOrgFilterChange}
        holiday={selectedOrgDay !== null ? orgCalendar.holidays[selectedOrgDay] : null}
        weekOff={selectedOrgDay !== null ? orgCalendar.weekOffs[selectedOrgDay] : null}
        isCalendarSelection={selectedOrgDay !== null}
        onClearSelectedDay={() => setSelectedOrgDay(null)}
      />

      {orgPagination.pages > 1 && (
        <Pagination
          currentPage={orgPagination.page}
          totalPages={orgPagination.pages}
          totalRecords={orgPagination.total}
          limit={orgPagination.limit}
          onPageChange={setPage => setOrgPagination(p => ({ ...p, page: setPage }))}
          showPageSize
          onPageSizeChange={limit => setOrgPagination(p => ({ ...p, limit, page: 1 }))}
        />
      )}
    </>
  );

  const renderEmployeeView = () => (
    <>
      <AttendanceStats stats={selfStats} />
      {renderSelfAttendanceSection("Today's Check In / Out")}
      {renderCalendarSection({
        title: `${personalMonthLabel} — My Calendar`,
        viewDateObj: personalViewDate,
        calendarDays: personalCalendarDays,
        selectedDay: selectedPersonalDay,
        onDaySelect: handlePersonalDaySelect,
        onPrev: () => shiftPersonalMonth(-1),
        onNext: () => shiftPersonalMonth(1),
      })}

      <TodayAttendanceTable
        key={
          selectedPersonalDay
            ? `day-${selectedPersonalDay}`
            : `filter-${selfFilters.filterType}-${selfFilters.startDate}-${selfFilters.endDate}`
        }
        title={getTableTitle("My Attendance History", selectedPersonalDay, personalViewDate, selfFilters)}
        rows={displayedPersonalRows}
        loading={loading}
        target="self"
        downloadParams={buildListParams("self", personalViewDate, selectedPersonalDay, selfFilters, { page: 1, limit: 10 })}
        filters={selfFilters}
        onFilterChange={handleSelfFilterChange}
        holiday={selectedPersonalDay !== null ? selfCalendar.holidays[selectedPersonalDay] : null}
        weekOff={selectedPersonalDay !== null ? selfCalendar.weekOffs[selectedPersonalDay] : null}
        isCalendarSelection={selectedPersonalDay !== null}
        onClearSelectedDay={() => setSelectedPersonalDay(null)}
      />

      {selfPagination.pages > 1 && (
        <Pagination
          currentPage={selfPagination.page}
          totalPages={selfPagination.pages}
          totalRecords={selfPagination.total}
          limit={selfPagination.limit}
          onPageChange={setPage => setSelfPagination(p => ({ ...p, page: setPage }))}
          showPageSize
          onPageSizeChange={limit => setSelfPagination(p => ({ ...p, limit, page: 1 }))}
        />
      )}

      {hasTeam && (
        <div>
          <TodayAttendanceTable
            key={`team-filter-${teamFilters.filterType}-${teamFilters.startDate}-${teamFilters.endDate}`}
            title={`${getFilterDefaultTitle(teamFilters)} — My Team`}
            rows={displayedTeamRows}
            loading={loading}
            target="team"
            downloadParams={buildListParams("team", personalViewDate, null, teamFilters, { page: 1, limit: 10 })}
            filters={teamFilters}
            onFilterChange={handleTeamFilterChange}
          />

          {teamPagination.pages > 1 && (
            <Pagination
              currentPage={teamPagination.page}
              totalPages={teamPagination.pages}
              totalRecords={teamPagination.total}
              limit={teamPagination.limit}
              onPageChange={setPage => setTeamPagination(p => ({ ...p, page: setPage }))}
              showPageSize
              onPageSizeChange={limit => setTeamPagination(p => ({ ...p, limit, page: 1 }))}
            />
          )}
        </div>
      )}
    </>
  );

  const roleViews = {
    Organization: renderOrganizationView,
    HR: renderHRView,
    Employee: renderEmployeeView,
  };

  return (
    <MainLayout>
      <div className="attendance-page">
        <div className="attendance-header-banner">
          <div>
            <h1 className="attendance-title">Attendance</h1>
            <p className="attendance-subtitle">{ROLE_DESCRIPTIONS[viewRole]}</p>
          </div>
        </div>

        {error ? <p className="attendance-alert attendance-alert--error">{error}</p> : null}
        {roleViews[viewRole]?.()}

        {/* Selfie Camera Capture Modal */}
        <SelfieCapture
          open={showSelfieModal}
          mode={attendanceAction}
          onClose={() => !checkInSubmitting && setShowSelfieModal(false)}
          onCapture={handleSelfieCapture}
          submitting={checkInSubmitting}
        />

        {isReportModalOpen && <MonthlyAttendanceReport handleReportModalClose={handleReportModalClose}/>}

        {/* Confirmation Modal */}
        <ConfirmModal
          open={modal.open}
          title={modal.title}
          message={modal.message}
          confirmLabel={modal.confirmLabel}
          variant={modal.variant}
          loading={actionLoading}
          onConfirm={modal.onConfirm}
          onCancel={closeModal}
        />

        {showMonthlyUploadModal ? (
          <div className="month-upload-backdrop" role="presentation">
            <section className="month-upload-modal" role="dialog" aria-modal="true" aria-labelledby="month-upload-title">
              <header className="month-upload-modal__header">
                <div>
                  <h2 id="month-upload-title">Bulk Upload Monthly Attendance</h2>
                  <p>Upload an Excel file using Employee Code to identify each employee.</p>
                </div>
                <button
                  type="button"
                  className="month-upload-close"
                  onClick={() => !monthlyUploadLoading && setShowMonthlyUploadModal(false)}
                  aria-label="Close bulk upload"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="month-upload-modal__body">
                <div className="month-upload-template-download">
                  <span>Need the required format?</span>
                  <button type="button" onClick={downloadMonthlyUploadTemplate}>Download Sample Excel Template</button>
                </div>
                <div
                  className={`month-upload-drop-zone ${monthlyUploadDragActive ? "drag-active" : ""}`}
                  onDragEnter={handleMonthlyUploadDrag}
                  onDragLeave={handleMonthlyUploadDrag}
                  onDragOver={handleMonthlyUploadDrag}
                  onDrop={handleMonthlyUploadDrop}
                >
                  <input
                    ref={monthlyUploadInputRef}
                    id="monthly-upload-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => setMonthlyUploadFileSafely(event.target.files?.[0])}
                    disabled={monthlyUploadLoading}
                    hidden
                  />
                  <label htmlFor="monthly-upload-file">
                    {monthlyUploadFile ? (
                      <><strong>{monthlyUploadFile.name}</strong><small>{(monthlyUploadFile.size / 1024).toFixed(1)} KB · Click to replace</small></>
                    ) : (
                      <><strong>Drop your Excel file here</strong><small>or click to browse (.xlsx, .xls · max 5 MB)</small></>
                    )}
                  </label>
                </div>

                {monthlyUploadResult ? (
                  <div className={`month-upload-result ${monthlyUploadResult.errors?.length ? "month-upload-result--errors" : ""}`}>
                    {monthlyUploadResult.totalRows !== undefined ? (
                      <p className="month-upload-summary">
                        Total: {monthlyUploadResult.totalRows} · Uploaded: {monthlyUploadResult.uploaded} · Failed: {monthlyUploadResult.failed}
                      </p>
                    ) : null}
                    {monthlyUploadResult.errors?.length ? (
                      <ul className="month-upload-errors">
                        {monthlyUploadResult.errors.map((item, index) => (
                          <li key={`${item.row || "error"}-${index}`}>
                            {item}
                            {/* {item.row ? `Row ${item.row} (${item.employeeCode}): ` : ""}{item.message} */}
                          </li>
                        ))}
                      </ul>
                    ) : monthlyUploadResult.uploaded ? <p className="month-upload-success">All rows were uploaded successfully.</p> : null}
                  </div>
                ) : null}
              </div>

              <footer className="month-upload-modal__actions">
                <Button type="button" variant="secondary" onClick={() => setShowMonthlyUploadModal(false)} disabled={monthlyUploadLoading}>
                  Close
                </Button>
                <Button type="button" icon={<Upload size={16} />} onClick={handleMonthlyBulkUpload} disabled={monthlyUploadLoading || !monthlyUploadFile}>
                  {monthlyUploadLoading ? "Uploading..." : "Upload File"}
                </Button>
              </footer>
            </section>
          </div>
        ) : null}
      </div>
    </MainLayout>
  );
}

export default function AttendancePage() {
  return (
    <ToastProvider>
      <Attendance />
    </ToastProvider>
  );
}
