import { forwardRef } from "react";
import FormField, { getFieldAria, useFieldIds } from "./FormField";

const Textarea = forwardRef(function Textarea(
  {
    label,
    name,
    id,
    value,
    onChange,
    onBlur,
    error,
    helperText,
    required = false,
    disabled = false,
    rows = 4,
    className,
    ...rest
  },
  ref
) {
  const { fieldId, messageId } = useFieldIds(id);
  return (
    <FormField
      label={label}
      fieldId={fieldId}
      messageId={messageId}
      required={required}
      error={error}
      helperText={helperText}
      disabled={disabled}
      className={className}
    >
      <textarea
        ref={ref}
        id={fieldId}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        rows={rows}
        className="wz-field__input wz-field__textarea"
        {...getFieldAria({ error, helperText, required, messageId })}
        {...rest}
      />
    </FormField>
  );
});

export default Textarea;
