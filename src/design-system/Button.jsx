import { forwardRef } from "react";
import Spinner from "./Spinner";
import { cx } from "./utils";
import "./Button.css";

const VARIANTS = ["primary", "secondary", "outline", "ghost", "danger"];
const SIZES = ["sm", "md", "lg"];

const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    icon,
    iconRight,
    loading = false,
    fullWidth = false,
    type = "button",
    disabled,
    className,
    children,
    ...rest
  },
  ref
) {
  const safeVariant = VARIANTS.includes(variant) ? variant : "primary";
  const safeSize = SIZES.includes(size) ? size : "md";
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        "wz-btn",
        `wz-btn--${safeVariant}`,
        `wz-btn--${safeSize}`,
        fullWidth && "wz-btn--full",
        !children && "wz-btn--icon-only",
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Spinner size={16} label="" />
      ) : (
        icon && <span className="wz-btn__icon" aria-hidden="true">{icon}</span>
      )}
      {children != null && children !== false && <span className="wz-btn__label">{children}</span>}
      {iconRight && !loading && (
        <span className="wz-btn__icon" aria-hidden="true">{iconRight}</span>
      )}
    </button>
  );
});

export default Button;
