import React, { useState, useEffect } from "react";
import "./UpdatePayrollModal.css";

const UpdatePayrollModal = ({ isOpen, onClose, itemToEdit, onSave }) => {
  const [formData, setFormData] = useState({
    refNo: "",
    beneficiaryName: "",
    amount: 0,
    accountNo: "",
    ifsc: "",
    paymentDate: "",
    year: "",
    status: "",
    comment:"",
  });

  useEffect(() => {
    if (itemToEdit) {
      setFormData({
        refNo: itemToEdit.refNo || "",
        beneficiaryName: itemToEdit.beneficiaryName || "",
        amount: itemToEdit.amount || 0,
        accountNo: itemToEdit.accountNo || "",
        ifsc: itemToEdit.ifsc || "",
        paymentDate: itemToEdit.paymentDate
          ? new Date(itemToEdit.paymentDate).toISOString().split("T")[0]
          : "",
        year: itemToEdit.year || "",
        status: itemToEdit.status || "Pending",
        comment: itemToEdit?.comment || ""
      });
    }
  }, [itemToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? Number(value) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...itemToEdit, ...formData });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="overlay">
      <div className="container">
        <div className="header">
          <h2>Update Payroll Record</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="payroll-form">
          <div className="form-grid">
            
            <div className="form-group">
              <label>EMP ID / Ref No</label>
              <input
                type="text"
                name="refNo"
                value={formData.refNo}
                onChange={handleChange}
                required
                disabled  
              />
            </div>
              
            <div className="grid-group">
              <div className="form-group">
                <label>Beneficiary Name</label>
                <input
                  type="text"
                  name="beneficiaryName"
                  value={formData.beneficiaryName}
                  onChange={handleChange}
                  required
                />
              </div>
            

              <div className="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  min="0"
                  required
                />
              </div>
            </div>
            <div className="grid-group">
              <div className="form-group">
                <label>Account Number</label>
                <input
                  type="text"
                  name="accountNo"
                  value={formData.accountNo}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>IFSC Code</label>
                <input
                  type="text"
                  name="ifsc"
                  value={formData.ifsc}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="grid-group">
              <div className="form-group">
                <label>Payment Date</label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Year</label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  min="2000"
                  max="2100"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="Pending">Pending</option>
                <option value="Processed">Processed</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Comment</label>
              <textarea
                name="comment"
                value={formData?.comment}
                onChange={handleChange}
                rows="4"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdatePayrollModal;