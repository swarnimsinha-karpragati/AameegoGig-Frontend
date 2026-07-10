import { useCallback, useState } from "react";
import { validateField, validateFields } from "../utils/inputValidation";

/**
 * Reusable form validation hook — validates fields by label, name, and input type.
 *
 * @example
 * const { errors, validateOne, validateAll, clearError } = useFormValidation();
 * validateOne({ name: "email", label: "Email", value, inputType: "email", required: true });
 */
export default function useFormValidation() {
  const [errors, setErrors] = useState({});

  const validateOne = useCallback((field) => {
    const key = field.name || field.label;
    const err = validateField(field);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[key] = err;
      else delete next[key];
      return next;
    });
    return err;
  }, []);

  const validateAll = useCallback((fields) => {
    const result = validateFields(fields);
    setErrors(result.errors);
    return result;
  }, []);

  const clearError = useCallback((name) => {
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setErrors({}), []);

  return { errors, validateOne, validateAll, clearError, clearAll, setErrors };
}
