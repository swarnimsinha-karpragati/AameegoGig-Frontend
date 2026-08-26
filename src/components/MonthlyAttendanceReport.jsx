import { useState } from 'react';
import Button from './Button';
import './MonthlyAttendanceReport.css';
import {X} from "lucide-react";
import { getStoredUser } from '../utils/roles';
import { monthReport } from '../services/attendanceService';

const MonthlyAttendanceReport = ({ handleReportModalClose }) => {
    const handleClose = () => {
        handleReportModalClose();
    };

    const user = getStoredUser()

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthIndex = today.getMonth();
    const currentMonthName = months[currentMonthIndex];

    const years = [currentYear, currentYear - 1, currentYear - 2];

    const [reportYear, setReportYear] = useState(currentYear);
    const [reportMonth, setReportMonth] = useState(currentMonthName);

    const getAvailableMonths = () => {
        if (Number(reportYear) === currentYear) {
            return months.slice(0, currentMonthIndex + 1);
        }
        return months;
    };

    const handleYearChange = (e) => {
        const newYear = Number(e.target.value);
        setReportYear(newYear);

        if (newYear === currentYear) {
            const available = months.slice(0, currentMonthIndex + 1);
            if (!available.includes(reportMonth)) {
                setReportMonth(currentMonthName);
            }
        }
    };
    const [loading,setLoading] = useState(false)

    const handleDownload = async () => {
        try {
            setLoading(true);
            const blobData = await monthReport(user?.vendorId, reportMonth, reportYear);

            const url = window.URL.createObjectURL(new Blob([blobData]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Attendance_Report_${reportMonth}_${reportYear}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            window.URL.revokeObjectURL(url);
            handleReportModalClose();
        } catch (error) {
            let errorMessage = "Could not download the report. Please try again.";
            if (error.response && error.response.data instanceof Blob) {
                try {
                    const errorText = await error.response.data.text();
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.message) {
                        errorMessage = errorJson.message;
                    }
                } catch (e) {
                    console.error("Failed to parse error blob", e);
                }
            }

            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='mar-overlay'>
            <div className="mar-modal">
                <div className="mar-header">
                    <h3>Download monthly attendance report</h3>
                    <Button className='action-btn-edit' icon={<X/>} onClick={handleClose} disabled={loading}></Button>
                </div>
                <div className="mar-body">
                    <div className="select-group">
                        <label htmlFor="year-select">Year</label>
                        <select 
                            name="year" 
                            id="year-select" 
                            value={reportYear} 
                            onChange={handleYearChange}
                        >
                            {years.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="select-group">
                        <label htmlFor="month-select">Month</label>
                        <select 
                            name="month" 
                            id="month-select" 
                            value={reportMonth} 
                            onChange={(e) => setReportMonth(e.target.value)}
                        >
                            {getAvailableMonths().map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Button onClick={handleDownload} disabled={loading}>Download</Button>
                </div>
            </div>
        </div>
    );
};

export default MonthlyAttendanceReport;