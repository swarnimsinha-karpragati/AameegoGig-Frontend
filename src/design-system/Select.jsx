import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import FormField, { getFieldAria, useFieldIds } from "./FormField";
import { cx } from "./utils";

const Select = forwardRef(function Select(
  {
    label,
    name,
    id,
    value,
    onChange,
    onBlur,
    options = [],
    placeholder,
    error,
    helperText,
    required = false,
    disabled = false,
    className,
    ...rest
  },
  ref
) {
  const { fieldId, messageId } = useFieldIds(id);
  const isPlaceholderShown = placeholder != null && (value === "" || value == null);
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
      <div className="wz-field__control">
        <select
          ref={ref}
          id={fieldId}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={cx(
            "wz-field__input",
            "wz-field__select",
            isPlaceholderShown && "wz-field__select--placeholder"
          )}
          {...getFieldAria({ error, helperText, required, messageId })}
          {...rest}
        >
          {placeholder != null && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={String(option.value)} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="wz-field__chevron" aria-hidden="true">
          <ChevronDown />
        </span>
      </div>
    </FormField>
  );
});

export default Select;
