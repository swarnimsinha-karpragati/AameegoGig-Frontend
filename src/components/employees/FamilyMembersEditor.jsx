import { Plus, Trash2 } from "lucide-react";
import {
  FAMILY_COVERAGE_OPTIONS,
  FAMILY_RELATIONS,
  MAX_FAMILY_MEMBERS,
  createEmptyFamilyMember,
  familyFieldPath,
  localToday,
} from "../../utils/familyMembers";
import "./FamilyMembersEditor.css";

function FamilyMembersEditor({ members = [], onChange, errors = {} }) {
  const rows = Array.isArray(members) ? members : [];
  const listError = errors.familyMembers;
  const atLimit = rows.length >= MAX_FAMILY_MEMBERS;

  const updateRow = (index, field, value) =>
    onChange(
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
      { touched: familyFieldPath(index, field) }
    );
  const addRow = () => onChange([...rows, createEmptyFamilyMember()], {});
  const removeRow = (index) => onChange(rows.filter((_, i) => i !== index), { removedIndex: index });

  const renderError = (path) => (
    <p className={`emp-field-error${errors[path] ? "" : " emp-field-error--empty"}`} aria-live="polite">
      {errors[path] || " "}
    </p>
  );
  const inputProps = (index, field) => {
    const path = familyFieldPath(index, field);
    return {
      id: `emp-field-${path}`,
      name: path,
      value: rows[index]?.[field] || "",
      onChange: (e) => updateRow(index, field, e.target.value),
      className: errors[path] ? "emp-field-input--error" : undefined,
      "aria-invalid": Boolean(errors[path]),
    };
  };

  return (
    <div className="family-editor">
      <p className="family-editor__hint">
        Add dependents to be covered under ESIC or the company medical insurance.
      </p>

      {rows.length === 0 ? (
        <div className="family-editor__empty">No family members added yet.</div>
      ) : (
        rows.map((_, index) => (
          <div className="family-editor__card" key={index}>
            <div className="family-editor__card-head">
              <span>Family Member {index + 1}</span>
              <button
                type="button"
                className="family-editor__remove"
                onClick={() => removeRow(index)}
                aria-label={`Remove family member ${index + 1}`}
              >
                <Trash2 size={15} /> Remove
              </button>
            </div>
            <div className="emp-form-grid">
              <div className="emp-field">
                <label htmlFor={`emp-field-${familyFieldPath(index, "name")}`}>
                  Name<span className="emp-required">*</span>
                </label>
                <input {...inputProps(index, "name")} type="text" maxLength={100} placeholder="Enter full name" />
                {renderError(familyFieldPath(index, "name"))}
              </div>
              <div className="emp-field">
                <label htmlFor={`emp-field-${familyFieldPath(index, "relation")}`}>
                  Relation<span className="emp-required">*</span>
                </label>
                <select {...inputProps(index, "relation")}>
                  <option value="">Select relation</option>
                  {FAMILY_RELATIONS.map((relation) => (
                    <option key={relation} value={relation}>{relation}</option>
                  ))}
                </select>
                {renderError(familyFieldPath(index, "relation"))}
              </div>
              <div className="emp-field">
                <label htmlFor={`emp-field-${familyFieldPath(index, "dob")}`}>
                  Date of Birth<span className="emp-required">*</span>
                </label>
                <input {...inputProps(index, "dob")} type="date" min="1900-01-01" max={localToday()} />
                {renderError(familyFieldPath(index, "dob"))}
              </div>
              <div className="emp-field">
                <label htmlFor={`emp-field-${familyFieldPath(index, "coverage")}`}>
                  Covered Under<span className="emp-required">*</span>
                </label>
                <select {...inputProps(index, "coverage")}>
                  <option value="">Select ESIC / Medical</option>
                  {FAMILY_COVERAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {renderError(familyFieldPath(index, "coverage"))}
              </div>
            </div>
          </div>
        ))
      )}

      {listError ? <p className="emp-field-error" id="emp-field-familyMembers">{listError}</p> : null}

      <button type="button" className="family-editor__add" onClick={addRow} disabled={atLimit}>
        <Plus size={16} />
        {atLimit ? `Maximum ${MAX_FAMILY_MEMBERS} family members` : "Add Family Member"}
      </button>
    </div>
  );
}

export default FamilyMembersEditor;
