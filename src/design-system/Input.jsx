import { forwardRef } from "react";
import FormField, { getFieldAria, useFieldIds } from "./FormField";
import { cx } from "./utils";

const Input = forwardRef(function Input(
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
    type = "text",
    leftIcon,
    disabled = false,
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
      <div className="wz-field__control">
        {leftIcon && (
          <span className="wz-field__icon" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={cx("wz-field__input", leftIcon && "wz-field__input--with-icon")}
          {...getFieldAria({ error, helperText, required, messageId })}
          {...rest}
        />
      </div>
    </FormField>
  );
});

export default Input;
