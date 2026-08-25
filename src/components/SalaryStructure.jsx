import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Layers, Pencil, Trash2, AlertCircle } from "lucide-react";
import Button from "../components/Button";
import { getStoredUser } from "../utils/roles";
import { 
    getStructure, 
    getSalaryComponents, 
    createSalaryStructure,
    updateSalaryStructure,
    deleteSalaryStructure
} from "../services/salaryComponentService";
import "./SalaryStructure.css";

const SalaryStructure = () => {
    const user = getStoredUser();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalError, setGlobalError] = useState("");
    
    // Modal & Form State
    const [showModal, setShowModal] = useState(false);
    const [componentsList, setComponentsList] = useState([]);
    const [newStructure, setNewStructure] = useState({ name: "", description: "", earnings: [], deductions: [] });
    const [editingId, setEditingId] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState("");

    // Use a ref to check if component is mounted to prevent state updates on unmounted component
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setGlobalError("");
            const res = await getStructure(user?.vendorId);
            if (isMounted.current) {
                setData(res.data?.data || res.data || []);
            }
        } catch (err) {
            console.error("Error fetching structures:", err);
            if (isMounted.current) {
                setGlobalError(err.response?.data?.message || "Failed to load salary structures.");
            }
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    const fetchComponents = async () => {
        try {
            const res = await getSalaryComponents(true);
            if (isMounted.current) {
                setComponentsList(res.data?.data || []);
            }
        } catch (err) {
            console.error("Error fetching components:", err);
            if (isMounted.current) {
                setGlobalError("Failed to load component library. Some features may be unavailable.");
            }
        }
    };

    useEffect(() => {
        if (user?.vendorId) {
            fetchData();
            fetchComponents();
        }
        // eslint-disable-next-line 
    }, []);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (!showModal) return undefined;
        fetchComponents();
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [showModal]);

    const handleOpenModal = () => {
        if (componentsList.length === 0) {
            alert("Please create at least one Salary Component before creating a Salary Structure.");
            return;
        }

        // Find the basic component to forcefully include it
        const basicComp = componentsList.find(c => c.code === "BASIC");
        
        setEditingId(null);
        setNewStructure({
            name: "",
            description: "",
            earnings: basicComp ? [{ componentId: basicComp._id }] : [],
            deductions: []
        });
        setError("");
        setShowModal(true);
    };

    const handleEdit = (struct) => {
        setEditingId(struct._id);

        const basicComp = componentsList.find(c => c.code === "BASIC");
        let parsedEarnings = (struct.earnings || [])
            .filter(e => e.componentId)
            .map(e => ({ componentId: e.componentId._id || e.componentId }));

        // Ensure BASIC is always included, even if legacy data is missing it
        if (basicComp && !parsedEarnings.some(e => e.componentId === basicComp._id)) {
            parsedEarnings.push({ componentId: basicComp._id });
        }

        setNewStructure({
            name: struct.name || "",
            description: struct.description || "",
            earnings: parsedEarnings,
            deductions: (struct.deductions || [])
                .filter(d => d.componentId)
                .map(d => ({ componentId: d.componentId._id || d.componentId }))
        });
        setError("");
        setShowModal(true);
    };

    const handleDelete = async (struct) => {
        if (!window.confirm(`Are you sure you want to delete the structure "${struct.name}"? If it is assigned to employees, it will be disabled (soft-deleted) to prevent payslip issues.`)) {
            return;
        }

        try {
            setGlobalError("");
            await deleteSalaryStructure(user.vendorId, struct._id);
            await fetchData();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete structure.");
        }
    };

    const handleToggleComponent = (comp) => {
        if (error) setError(""); // Clear error when user makes a change
        
        // BASIC is strictly compulsory, do not allow toggling
        if (comp.code === "BASIC") return; 

        const key = comp.category === "Earning" ? "earnings" : "deductions";
        
        setNewStructure((prev) => {
            const exists = (prev[key] || []).some((item) => item.componentId === comp._id);
            if (exists) {
                return { ...prev, [key]: prev[key].filter((item) => item.componentId !== comp._id) };
            } else {
                return { ...prev, [key]: [...(prev[key] || []), { componentId: comp._id }] };
            }
        });
    };

    const handleSaveStructure = async () => {
        const trimmedName = newStructure.name.trim();
        const trimmedDesc = newStructure.description.trim();

        // 1. Validations
        if (!trimmedName) {
            setError("Structure Name is required.");
            return;
        }
        if (trimmedName.length > 100) {
            setError("Structure Name cannot exceed 100 characters.");
            return;
        }
        if (trimmedDesc.length > 500) {
            setError("Description cannot exceed 500 characters.");
            return;
        }
        if (newStructure.earnings.length === 0 && newStructure.deductions.length === 0) {
            setError("Please select at least one Earning or Deduction component.");
            return;
        }

        try {
            setFormLoading(true);
            setError("");
            
            const payload = {
                vendorId: user.vendorId,
                name: trimmedName,
                description: trimmedDesc,
                earnings: newStructure.earnings,
                deductions: newStructure.deductions
            };

            if (editingId) {
                await updateSalaryStructure(user.vendorId, editingId, payload);
            } else {
                await createSalaryStructure(payload);
            }

            setShowModal(false);
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save salary structure. Please try again.");
        } finally {
            if (isMounted.current) setFormLoading(false);
        }
    };

    const availableEarnings = componentsList.filter((c) => c.category === "Earning");
    const availableDeductions = componentsList.filter((c) => c.category === "Deduction");

    return (
        <div className="salary-structure">
            <div className="salary-struct-header">
                <div>
                    <h1>Organization Salary Structure</h1>
                    <p>Manage and configure compensation structures for your employees.</p>
                </div>
                <Button 
                    onClick={handleOpenModal} 
                    disabled={loading}
                    title={componentsList.length === 0 && !loading ? "Create salary components first" : "Add Structure"}
                >
                    Add Structure
                </Button>
            </div>

            {globalError && (
                <div className="salary-cm__msg error" style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertCircle size={18} />
                    {globalError}
                </div>
            )}

            <div className="salary-struct-main">
                {loading ? (
                    <div className="loading-state">Loading structures...</div>
                ) : data && data.length > 0 ? (
                    <div className="struct-table-container">
                        <table className="struct-table">
                            <thead>
                                <tr>
                                    <th className="col-name">Name</th>
                                    <th className="col-desc">Description</th>
                                    <th className="col-earn">Earnings</th>
                                    <th className="col-deduct">Deductions</th>
                                    <th className="col-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((struct) => (
                                    <tr key={struct._id}>
                                        <td>
                                            <div className="struct-name-cell">{struct.name}</div>
                                        </td>
                                        <td>
                                            <div className="struct-desc-cell">
                                                {struct.description || <span className="no-desc">No description</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="pill-container">
                                                {struct.earnings?.length > 0 ? (
                                                    struct.earnings.map((item, index) => (
                                                        <span key={`earn-${struct._id}-${index}`} className="pill pill-earning">
                                                            {item.componentId?.name || "Unknown"}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="no-data">None</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="pill-container">
                                                {struct.deductions?.length > 0 ? (
                                                    struct.deductions.map((item, index) => (
                                                        <span key={`deduct-${struct._id}-${index}`} className="pill pill-deduction">
                                                            {item.componentId?.name || "Unknown"}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="no-data">None</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button className="action-btn action-btn-edit" onClick={() => handleEdit(struct)} title="Edit">
                                                    <Pencil size={18} />
                                                </button>
                                                <button className="action-btn action-btn-delete" onClick={() => handleDelete(struct)} title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <Layers className="empty-state-icon" size={40} />
                        <p>No salary structures have been created yet.</p>
                        <Button 
                            onClick={handleOpenModal}
                            title={componentsList.length === 0 ? "Create salary components first" : "Create Your First Structure"}
                        >
                            Create Your First Structure
                        </Button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal &&
                createPortal(
                    <div className="salary-cm__overlay" onClick={() => !formLoading && setShowModal(false)}>
                        <div className="salary-cm__modal" onClick={(e) => e.stopPropagation()}>
                            
                            <div className="salary-cm__modal-head">
                                <div>
                                    <h3>{editingId ? "Edit Salary Structure" : "Create Salary Structure"}</h3>
                                    <p className="salary-cm__modal-subtitle">Group earnings and deductions into a reusable structure.</p>
                                </div>
                                <button 
                                    type="button" 
                                    className="salary-cm__modal-close" 
                                    onClick={() => setShowModal(false)}
                                    disabled={formLoading}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="salary-cm__modal-body">
                                {error && (
                                    <div className="salary-cm__msg error" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <div className="salary-cm__modal-section">
                                    <div className="salary-cm__field">
                                        <label htmlFor="struct-name">Structure Name <span style={{color: "#ef4444"}}>*</span></label>
                                        <input 
                                            id="struct-name" 
                                            type="text" 
                                            maxLength={100}
                                            placeholder="e.g. Standard Tier, Marketing Team" 
                                            value={newStructure.name}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                // Only allow letters and spaces
                                                if (/^[a-zA-Z\s]*$/.test(val)) {
                                                    setNewStructure({...newStructure, name: val});
                                                    if (error) setError("");
                                                }
                                            }}
                                            disabled={formLoading}
                                        />
                                    </div>
                                    <div className="salary-cm__field">
                                        <label htmlFor="struct-desc">Description</label>
                                        <textarea 
                                            id="struct-desc"
                                            maxLength={500} 
                                            placeholder="Briefly describe who this structure is for (max 500 characters)..." 
                                            value={newStructure.description}
                                            onChange={(e) => {
                                                setNewStructure({...newStructure, description: e.target.value});
                                                if (error) setError("");
                                            }}
                                            disabled={formLoading}
                                        />
                                    </div>
                                </div>

                                <div className="salary-cm__columns">
                                    {/* Earnings Selection Column */}
                                    <div className="salary-cm__col">
                                        <div className="salary-cm__col-head earning">
                                            <span>Select Earnings</span>
                                            <Layers size={15} />
                                        </div>
                                        <div className="salary-cm__options">
                                            {availableEarnings.length > 0 ? availableEarnings.map(comp => {
                                                const isBasic = comp.code === "BASIC";
                                                return (
                                                <label key={comp._id} className={`salary-cm__check ${isBasic ? 'disabled' : ''}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isBasic || newStructure.earnings.some(c => c.componentId === comp._id)}
                                                        onChange={() => handleToggleComponent(comp)}
                                                        disabled={formLoading || isBasic}
                                                    />
                                                    <span>
                                                        {comp.name} 
                                                        
                                                        {isBasic && <span style={{color: '#ef4444', marginLeft: '4px', fontSize: '12px'}}>*Required</span>}
                                                    </span>
                                                </label>
                                            )}) : <p className="no-options">No earnings available.</p>}
                                        </div>
                                    </div>

                                    {/* Deductions Selection Column */}
                                    <div className="salary-cm__col">
                                        <div className="salary-cm__col-head deduction">
                                            <span>Select Deductions</span>
                                            <Layers size={15} />
                                        </div>
                                        <div className="salary-cm__options">
                                            {availableDeductions.length > 0 ? availableDeductions.map(comp => (
                                                <label key={comp._id} className="salary-cm__check">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={newStructure.deductions.some(c => c.componentId === comp._id)}
                                                        onChange={() => handleToggleComponent(comp)}
                                                        disabled={formLoading}
                                                    />
                                                    <span>{comp.name}</span>
                                                </label>
                                            )) : <p className="no-options">No deductions available.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="salary-cm__modal-foot">
                                <Button className="secondary-btn" onClick={() => setShowModal(false)} disabled={formLoading}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveStructure} disabled={formLoading || !newStructure.name.trim()}>
                                    {formLoading ? "Saving..." : (editingId ? "Update Structure" : "Save Structure")}
                                </Button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
};

export default SalaryStructure;