import { useState, useEffect, useRef } from "react";
import { Save, IndianRupee, Clock, AlertTriangle } from "lucide-react";
import { getLoanConfig, updateLoanConfig } from "../services/advanceLoanService";
import { ToastProvider, useToast } from "../components/Toast";
import Card from "../components/Card";

function LoanConfigurationInner({ initialConfig }) {
    const toast = useToast();
    const hasFetched = useRef(false);
    const [config, setConfig] = useState(initialConfig || null);
    const [loading, setLoading] = useState(!initialConfig);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState(initialConfig ? {
        loanInterestRate: initialConfig.loanInterestRate || 0,
        maxAdvanceAmount: initialConfig.maxAdvanceAmount || 0,
        maxLoanAmount: initialConfig.maxLoanAmount || 0,
        isLoanInterestEnabled: initialConfig.isLoanInterestEnabled !== false,
        maxTenureMonths: initialConfig.maxTenureMonths || 6,
        maxLoanTenureMonths: initialConfig.maxLoanTenureMonths || 12,
        maxAdvancePercentOfCTC: initialConfig.maxAdvancePercentOfCTC || 100,
        isAdvanceAllowed: initialConfig.isAdvanceAllowed !== false,
        isLoanAllowed: initialConfig.isLoanAllowed !== false,
        salaryEarningsLabel: initialConfig.salaryEarningsLabel || "Loan Deduction",
        advanceEarningsLabel: initialConfig.advanceEarningsLabel || "Advance Deduction",
        isSalaryDeductionActive: initialConfig.isSalaryDeductionActive !== false,
    } : {
        loanInterestRate: 0,
        maxAdvanceAmount: 0,
        maxLoanAmount: 0,
        isLoanInterestEnabled: true,
        maxTenureMonths: 6,
        maxLoanTenureMonths: 12,
        maxAdvancePercentOfCTC: 100,
        isAdvanceAllowed: true,
        isLoanAllowed: true,
        salaryEarningsLabel: "Loan Deduction",
        advanceEarningsLabel: "Advance Deduction",
        isSalaryDeductionActive: true,
    });

    useEffect(() => {
        if (initialConfig || hasFetched.current) return;
        hasFetched.current = true;

        const fetchConfig = async () => {
            try {
                setLoading(true);
                const res = await getLoanConfig();
                if (res.config) {
                    setConfig(res.config);
                    setFormData({
                        loanInterestRate: res.config.loanInterestRate || 0,
                        maxAdvanceAmount: res.config.maxAdvanceAmount || 0,
                        maxLoanAmount: res.config.maxLoanAmount || 0,
                        isLoanInterestEnabled: res.config.isLoanInterestEnabled !== false,
                        maxTenureMonths: res.config.maxTenureMonths || 6,
                        maxLoanTenureMonths: res.config.maxLoanTenureMonths || 12,
                        maxAdvancePercentOfCTC: res.config.maxAdvancePercentOfCTC || 100,
                        isAdvanceAllowed: res.config.isAdvanceAllowed !== false,
                        isLoanAllowed: res.config.isLoanAllowed !== false,
                        salaryEarningsLabel: res.config.salaryEarningsLabel || "Loan Deduction",
                        advanceEarningsLabel: res.config.advanceEarningsLabel || "Advance Deduction",
                        isSalaryDeductionActive: res.config.isSalaryDeductionActive !== false,
                    });
                }
            } catch (err) {
                toast.error("Failed to load configuration");
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [initialConfig, toast]);

    useEffect(() => {
        if (initialConfig) {
            setConfig(initialConfig);
            setFormData({
                loanInterestRate: initialConfig.loanInterestRate || 0,
                maxAdvanceAmount: initialConfig.maxAdvanceAmount || 0,
                maxLoanAmount: initialConfig.maxLoanAmount || 0,
                isLoanInterestEnabled: initialConfig.isLoanInterestEnabled !== false,
                maxTenureMonths: initialConfig.maxTenureMonths || 6,
                maxLoanTenureMonths: initialConfig.maxLoanTenureMonths || 12,
                maxAdvancePercentOfCTC: initialConfig.maxAdvancePercentOfCTC || 100,
                isAdvanceAllowed: initialConfig.isAdvanceAllowed !== false,
                isLoanAllowed: initialConfig.isLoanAllowed !== false,
                salaryEarningsLabel: initialConfig.salaryEarningsLabel || "Loan Deduction",
                advanceEarningsLabel: initialConfig.advanceEarningsLabel || "Advance Deduction",
                isSalaryDeductionActive: initialConfig.isSalaryDeductionActive !== false,
            });
            setLoading(false);
        }
    }, [initialConfig]);

    const handleChange = (field) => (e) => {
        const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...formData,
                loanInterestRate: Number(formData.loanInterestRate),
                maxAdvanceAmount: Number(formData.maxAdvanceAmount),
                maxLoanAmount: Number(formData.maxLoanAmount),
                maxTenureMonths: Number(formData.maxTenureMonths),
                maxLoanTenureMonths: Number(formData.maxLoanTenureMonths),
                maxAdvancePercentOfCTC: Number(formData.maxAdvancePercentOfCTC),
            };
            const res = await updateLoanConfig(payload);
            if (res.config) {
                setConfig(res.config);
                setFormData({
                    loanInterestRate: res.config.loanInterestRate || 0,
                    maxAdvanceAmount: res.config.maxAdvanceAmount || 0,
                    maxLoanAmount: res.config.maxLoanAmount || 0,
                    isLoanInterestEnabled: res.config.isLoanInterestEnabled !== false,
                    maxTenureMonths: res.config.maxTenureMonths || 6,
                    maxLoanTenureMonths: res.config.maxLoanTenureMonths || 12,
                    maxAdvancePercentOfCTC: res.config.maxAdvancePercentOfCTC || 100,
                    isAdvanceAllowed: res.config.isAdvanceAllowed !== false,
                    isLoanAllowed: res.config.isLoanAllowed !== false,
                    salaryEarningsLabel: res.config.salaryEarningsLabel || "Loan Deduction",
                    advanceEarningsLabel: res.config.advanceEarningsLabel || "Advance Deduction",
                    isSalaryDeductionActive: res.config.isSalaryDeductionActive !== false,
                });
                toast.success("Loan configuration updated successfully");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save configuration");
        } finally {
            setSaving(false);
        }
    };

    const maxLoanDisplay = formData.maxLoanAmount === 0 ? "No limit" : `₹${Number(formData.maxLoanAmount).toLocaleString()}`;
    const maxAdvanceDisplay = formData.maxAdvanceAmount === 0 ? "No limit" : `₹${Number(formData.maxAdvanceAmount).toLocaleString()}`;

    if (loading) {
        return (
            <div className="loan-config-page">
                <div className="loan-config-loading">
                    <div className="loan-config-spinner"></div>
                    <p>Loading configuration...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="loan-config-page">
            <div className="loan-config-header">
                <div className="loan-config-header-left">
                    <h2 className="loan-config-title">Loan Configuration</h2>
                    <p className="loan-config-subtitle">Configure interest rates, limits, and advance/loan settings</p>
                </div>
                <div className="loan-config-header-actions">
                    <button className="btn-secondary" onClick={handleSave} disabled={saving}><Save size={16} />{saving ? "Saving..." : "Save Configuration"}</button>
                </div>
            </div>

            {config && (
                <div className="loan-config-grid">
                    <Card icon={<IndianRupee size={22} />} iconClassName="blue">
                        <Card.Header>Loan Settings</Card.Header>
                        <Card.Body>
                            <div className="loan-config-section">
                                <div className="loan-config-group">
                                    <label>Max Loan Amount (₹)</label>
                                    <input type="number" className="loan-input" value={formData.maxLoanAmount} onChange={handleChange("maxLoanAmount")} min="0" placeholder="0 = No limit" />
                                    <span className="loan-hint">{maxLoanDisplay}</span>
                                </div>
                                <div className="loan-config-group">
                                    <label>Loan Interest Rate (%)</label>
                                    <div className="loan-input-wrapper">
                                        <input type="number" className="loan-input" value={formData.loanInterestRate} onChange={handleChange("loanInterestRate")} min="0" max="100" step="0.5" disabled={!formData.isLoanInterestEnabled} />
                                        <span className="loan-input-suffix">%</span>
                                    </div>
                                    <span className="loan-hint">Interest rate for loans. Applies to loans above ₹2,00,000</span>
                                </div>
                                <div className="loan-config-group">
                                    <label>Max Tenure for Loan (Months)</label>
                                    <div className="loan-input-wrapper">
                                        <input type="number" className="loan-input" value={formData.maxLoanTenureMonths} onChange={handleChange("maxLoanTenureMonths")} min="1" max="12" />
                                        <span className="loan-input-suffix"><Clock size={16} /></span>
                                    </div>
                                    <span className="loan-hint">Maximum months for loan repayment (up to 12 months)</span>
                                </div>
                                <div className="loan-config-group">
                                    <label>Enable Loan Interest</label>
                                    <label className="loan-checkbox">
                                        <input type="checkbox" checked={formData.isLoanInterestEnabled} onChange={handleChange("isLoanInterestEnabled")} />
                                        <span>Charge interest on loans</span>
                                    </label>
                                </div>
                                <div className="loan-config-group">
                                    <label>Salary Earnings Label (Loan)</label>
                                    <input type="text" className="loan-input" value={formData.salaryEarningsLabel} onChange={handleChange("salaryEarningsLabel")} placeholder="Loan Deduction" />
                                    <span className="loan-hint">Label shown as deduction in salary slip for loan repayments (default: Loan Deduction)</span>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>

                    <Card icon={<IndianRupee size={22} />} iconClassName="green">
                        <Card.Header>Advance Settings</Card.Header>
                        <Card.Body>
                            <div className="loan-config-section">
                                <div className="loan-config-group">
                                    <label>Max Advance Amount (₹)</label>
                                    <input type="number" className="loan-input" value={formData.maxAdvanceAmount} onChange={handleChange("maxAdvanceAmount")} min="0" placeholder="0 = No limit" />
                                    <span className="loan-hint">{maxAdvanceDisplay}</span>
                                </div>
                                <div className="loan-config-group">
                                    <label>Advance Limit (% of Monthly CTC)</label>
                                    <input type="number" className="loan-input" value={formData.maxAdvancePercentOfCTC} onChange={handleChange("maxAdvancePercentOfCTC")} min="0" max="100" />
                                    <span className="loan-hint">Advance amount cannot exceed this % of employee monthly CTC</span>
                                </div>
                                <div className="loan-config-group">
                                    <label>Max Tenure for One-Time (Months)</label>
                                    <div className="loan-input-wrapper">
                                        <input type="number" className="loan-input" value={formData.maxTenureMonths} onChange={handleChange("maxTenureMonths")} min="1" max="12" />
                                        <span className="loan-input-suffix"><Clock size={16} /></span>
                                    </div>
                                    <span className="loan-hint">Maximum months for One Time repayment option (up to 12 months)</span>
                                </div>
                                <div className="loan-config-group">
                                    <label>Salary Earnings Label (Advance)</label>
                                    <input type="text" className="loan-input" value={formData.advanceEarningsLabel} onChange={handleChange("advanceEarningsLabel")} placeholder="Advance Deduction" />
                                    <span className="loan-hint">Label shown as deduction in salary slip for advance repayments (default: Advance Deduction)</span>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>

                    <Card icon={<AlertTriangle size={22} />} iconClassName="orange">
                        <Card.Header>Module Toggles</Card.Header>
                        <Card.Body>
                            <div className="loan-config-section">
                                <div className="loan-config-group">
                                    <label className="loan-checkbox">
                                        <input type="checkbox" checked={formData.isAdvanceAllowed} onChange={handleChange("isAdvanceAllowed")} />
                                        <span>Advance Requests Allowed</span>
                                    </label>
                                </div>
                                <div className="loan-config-group">
                                    <label className="loan-checkbox">
                                        <input type="checkbox" checked={formData.isLoanAllowed} onChange={handleChange("isLoanAllowed")} />
                                        <span>Loan Requests Allowed</span>
                                    </label>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </div>
            )}
        </div>
    );
}

function LoanConfiguration({ initialConfig }) {
    return (
        <ToastProvider><LoanConfigurationInner initialConfig={initialConfig} /></ToastProvider>
    );
}

export default LoanConfiguration;