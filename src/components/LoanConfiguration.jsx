import { useState, useEffect, useRef } from "react";
import { Save, IndianRupee, Clock, AlertTriangle, Wallet, Percent, ToggleRight } from "lucide-react";
import { useLoanConfig, useUpdateLoanConfig } from "../hooks/useAdvanceLoan";
import { ToastProvider, useToast } from "../components/Toast";

function LoanConfigurationInner({ initialConfig }) {
    const toast = useToast();
    const successTimer = useRef(null);

    useEffect(() => {
        return () => {
            if (successTimer.current) clearTimeout(successTimer.current);
        };
    }, []);

    const { data: fetchedConfigRes, isLoading: loading } = useLoanConfig({
        enabled: !initialConfig,
    });
    const fetchedConfig = fetchedConfigRes?.config || null;
    const updateConfigMutation = useUpdateLoanConfig();

    const activeConfig = initialConfig || fetchedConfig;
    const [config, setConfig] = useState(activeConfig);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const buildFormData = (cfg) => cfg ? {
        loanInterestRate: cfg.loanInterestRate || 0,
        maxAdvanceAmount: cfg.maxAdvanceAmount || 0,
        maxLoanAmount: cfg.maxLoanAmount || 0,
        isLoanInterestEnabled: cfg.isLoanInterestEnabled !== false,
        maxTenureMonths: cfg.maxTenureMonths || 6,
        maxLoanTenureMonths: cfg.maxLoanTenureMonths || 12,
        maxAdvancePercentOfCTC: cfg.maxAdvancePercentOfCTC || 100,
        isAdvanceAllowed: cfg.isAdvanceAllowed !== false,
        isLoanAllowed: cfg.isLoanAllowed !== false,
        salaryEarningsLabel: cfg.salaryEarningsLabel || "Loan Deduction",
        advanceEarningsLabel: cfg.advanceEarningsLabel || "Advance Deduction",
        isSalaryDeductionActive: cfg.isSalaryDeductionActive !== false,
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
    };
    const [formData, setFormData] = useState(buildFormData(activeConfig));

    useEffect(() => {
        if (activeConfig) {
            setConfig(activeConfig);
            setFormData(buildFormData(activeConfig));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeConfig]);

    const handleChange = (field) => (e) => {
        const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (error) setError("");
        if (success) {
            setSuccess(false);
            if (successTimer.current) clearTimeout(successTimer.current);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccess(false);
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
            const res = await updateConfigMutation.mutateAsync(payload);
            if (res.config) {
                setConfig(res.config);
                setFormData(buildFormData(res.config));
                toast.success("Loan configuration updated successfully");
                setSuccess(true);
                if (successTimer.current) clearTimeout(successTimer.current);
                successTimer.current = setTimeout(() => setSuccess(false), 3500);
                setError("");
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to save configuration";
            setError(msg);
            toast.error(msg);
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
                    <button className="btn-secondary loan-save-btn" onClick={handleSave} disabled={saving}>
                        {saving ? <span className="loan-save-spinner"></span> : <Save size={16} />}
                        {saving ? "Saving..." : "Save Configuration"}
                    </button>
                </div>
            </div>
            {error && (
                <div className="loan-config-error">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {config && (
                <div className="loan-config-grid">
                    <div className="lcfg-card">
                        <div className="lcfg-card-head">
                            <div className="lcfg-card-icon blue"><IndianRupee size={20} /></div>
                            <div className="lcfg-card-head-text">
                                <h3 className="lcfg-card-title">Loan Settings</h3>
                                <p className="lcfg-card-sub">Interest rate and loan repayment limits</p>
                            </div>
                        </div>
                        <div className="lcfg-card-body">
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
                                    <span className="loan-hint">Interest rate for loans. Applies to all loans when enabled</span>
                                </div>
                                <div className="loan-config-group">
                                    <label>Max Tenure for Loan (Months)</label>
                                    <div className="loan-input-wrapper">
                                        <input type="number" className="loan-input" value={formData.maxLoanTenureMonths} onChange={handleChange("maxLoanTenureMonths")} min="1" placeholder="Default 12" />
                                        <span className="loan-input-suffix"><Clock size={16} /></span>
                                    </div>
                                    <span className="loan-hint">Maximum months for loan repayment (default 12)</span>
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
                        </div>
                    </div>

                    <div className="lcfg-card">
                        <div className="lcfg-card-head">
                            <div className="lcfg-card-icon green"><Wallet size={20} /></div>
                            <div className="lcfg-card-head-text">
                                <h3 className="lcfg-card-title">Advance Settings</h3>
                                <p className="lcfg-card-sub">Advance amount and monthly CTC limits</p>
                            </div>
                        </div>
                        <div className="lcfg-card-body">
                            <div className="loan-config-section">
                                <div className="loan-config-group">
                                    <label>Max Advance Amount (₹)</label>
                                    <input type="number" className="loan-input" value={formData.maxAdvanceAmount} onChange={handleChange("maxAdvanceAmount")} min="0" placeholder="0 = No limit" />
                                    <span className="loan-hint">{maxAdvanceDisplay} — fixed cap on advance amount</span>
                                </div>
                                <div className="loan-config-group">
                                    <label>Advance Limit (% of Monthly CTC)</label>
                                    <div className="loan-input-wrapper">
                                        <input type="number" className="loan-input" value={formData.maxAdvancePercentOfCTC} onChange={handleChange("maxAdvancePercentOfCTC")} min="0" max="100" />
                                        <span className="loan-input-suffix"><Percent size={16} /></span>
                                    </div>
                                    <span className="loan-hint">Advance cannot exceed this % of the employee's MONTHLY salary. If both a fixed cap and % are set, the lower of the two applies.</span>
                                </div>
                                <div className="loan-config-group">
                                    <label>Salary Earnings Label (Advance)</label>
                                    <input type="text" className="loan-input" value={formData.advanceEarningsLabel} onChange={handleChange("advanceEarningsLabel")} placeholder="Advance Deduction" />
                                    <span className="loan-hint">Label shown as deduction in salary slip for advance repayments (default: Advance Deduction)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lcfg-card">
                        <div className="lcfg-card-head">
                            <div className="lcfg-card-icon orange"><ToggleRight size={20} /></div>
                            <div className="lcfg-card-head-text">
                                <h3 className="lcfg-card-title">Module Toggles</h3>
                                <p className="lcfg-card-sub">Enable or disable advance / loan requests</p>
                            </div>
                        </div>
                        <div className="lcfg-card-body">
                            <div className="loan-config-section">
                                <div className="loan-config-group">
                                    <label>Requests</label>
                                    <label className="loan-checkbox">
                                        <input type="checkbox" checked={formData.isAdvanceAllowed} onChange={handleChange("isAdvanceAllowed")} />
                                        <span>Advance Requests Allowed</span>
                                    </label>
                                    <label className="loan-checkbox">
                                        <input type="checkbox" checked={formData.isLoanAllowed} onChange={handleChange("isLoanAllowed")} />
                                        <span>Loan Requests Allowed</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function LoanConfiguration({ initialConfig, onConfigUpdate }) {
    return (
        <ToastProvider><LoanConfigurationInner initialConfig={initialConfig} onConfigUpdate={onConfigUpdate} /></ToastProvider>
    );
}

export default LoanConfiguration;