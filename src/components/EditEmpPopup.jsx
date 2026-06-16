const EditEmpPopup = ({ selectedEmployee, onChange, handleUpdate }) => {
  // console.log("s", selectedEmployee);
  return (
    <>
      <h4
        style={{
          color: "#2563eb",
          marginBottom: "20px",
        }}
      >
        Edit Employee Information
      </h4>

      <div className="profile-section">
        {/* -------- Basic Information -------- */}

        <h4>Basic Information</h4>
        <div className="profile-grid">
          <div>
            <label>Employee Code</label>
            <span>{selectedEmployee.employeeCode}</span>
          </div>
          <div>
            <label>Name</label>
            <input
              type="text"
              value={selectedEmployee.name}
              onChange={onChange}
              name="name"
            />
          </div>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={selectedEmployee.email}
              onChange={onChange}
              name="email"
            />
          </div>
          <div>
            <label>Phone</label>
            <input
              type="text"
              value={selectedEmployee.phone}
              onChange={onChange}
              name="phone"
            />
          </div>
        </div>
      </div>

      <div className="profile-section">
        {/* -------- Employment Details -------- */}

        <h4>Employment Details</h4>
        <div className="profile-grid">
          <div>
            <label>Designation</label>
            <input
              type="text"
              value={selectedEmployee.designation}
              onChange={onChange}
              name="designation"
            />
          </div>
          <div>
            <label>Department</label>
            <input
              type="text"
              value={selectedEmployee.department}
              onChange={onChange}
              name="department"
            />
          </div>
          <div>
            <label>Location</label>
            <input
              type="text"
              value={selectedEmployee.location}
              onChange={onChange}
              name="location"
            />
          </div>
          <div>
            <label>Date Of Joining</label>
            <input
              type="date"
              value={
                selectedEmployee.dateOfJoining
                  ? new Date(selectedEmployee.dateOfJoining)
                      .toISOString()
                      .split("T")[0]
                  : ""
              }
              onChange={onChange}
              name="dateOfJoining"
            />
          </div>
          <div>
            <label>UAN</label>
            <input
              type="text"
              value={selectedEmployee.uan || "-"}
              onChange={onChange}
              name="uan"
            />
          </div>
          <div>
            <label>ESIC</label>
            <input
              type="text"
              value={selectedEmployee.esicNumber || "-"}
              onChange={onChange}
              name="esicNumber"
            />
          </div>
        </div>
      </div>

      <div className="profile-section">
        {/* -------- Personal Details -------- */}

        <h4>Personal Details</h4>
        <div className="profile-grid">
          <div>
            <label>Blood Group</label>
            <input
              type="text"
              value={selectedEmployee.bloodGroup || "-"}
              onChange={onChange}
              name="bloodGroup"
            />
          </div>
          <div>
            <label>Date of Birth</label>
            <input
              type="date"
              value={
                selectedEmployee.dateOfBirth
                  ? new Date(selectedEmployee.dateOfBirth)
                      .toISOString()
                      .split("T")[0]
                  : ""
              }
              onChange={onChange}
              name="dateOfBirth"
            />
          </div>
          <div>
            <label>Emergency Contact</label>
            <input
              type="text"
              value={selectedEmployee.emergencyContact || "-"}
              onChange={onChange}
              name="emergencyContact"
            />
          </div>
        </div>
      </div>

      <div className="profile-section">
        {/* -------- Government Details -------- */}

        <h4>Government Details</h4>
        <div className="profile-grid">
          <div>
            <label>Aadhaar Number</label>
            <input
              type="text"
              value={selectedEmployee.aadhaarNumber || "-"}
              onChange={onChange}
              name="aadhaarNumber"
            />
          </div>
          <div>
            <label>PAN Number</label>
            <input
              type="text"
              value={selectedEmployee.panNumber || "-"}
              onChange={onChange}
              name="panNumber"
            />
          </div>
          <div>
            <label>PF Number</label>
            <input
              type="text"
              value={selectedEmployee.pfNumber || "-"}
              onChange={onChange}
              name="pfNumber"
            />
          </div>
        </div>
      </div>

      <div className="profile-section">
        {/* -------- Bank Details -------- */}

        <h4>Bank Details</h4>
        <div className="profile-grid">
          <div>
            <label>Bank Name</label>
            <input
              type="text"
              value={selectedEmployee.bankName || "-"}
              onChange={onChange}
              name="bankName"
            />
          </div>
          <div>
            <label>Account Holder</label>
            <input
              type="text"
              value={selectedEmployee.accountHolderName || "-"}
              onChange={onChange}
              name="accountHolderName"
            />
          </div>
          <div>
            <label>Account Number</label>
            <input
              type="text"
              value={selectedEmployee.accountNumber || "-"}
              onChange={onChange}
              name="accountNumber"
            />
          </div>
          <div>
            <label>IFSC Code</label>
            <input
              type="text"
              value={selectedEmployee.ifscCode || "-"}
              onChange={onChange}
              name="ifscCode"
            />
          </div>
        </div>
      </div>

      <div className="profile-section">
        {/* -------- Education -------- */}

        <h4>Education</h4>
        <div className="profile-grid">
          <div>
            <label>Highest Qualification</label>
            <input
              type="text"
              value={selectedEmployee.highestQualification || "-"}
              onChange={onChange}
              name="highestQualification"
            />
          </div>
        </div>

        <button onClick={handleUpdate}>Update Changes</button>
      </div>
    </>
  );
};

export default EditEmpPopup;
