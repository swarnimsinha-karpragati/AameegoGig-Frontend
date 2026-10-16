import { cx } from "./utils";
import "./Spinner.css";

const NAMED_SIZES = { sm: 14, md: 20, lg: 32 };

export default function Spinner({ size = "md", label = "Loading", className }) {
  const px = typeof size === "number" ? size : NAMED_SIZES[size] ?? NAMED_SIZES.md;
  const decorative = !label;
  return (
    <span
      className={cx("wz-spinner", className)}
      style={{ width: px, height: px }}
      role={decorative ? undefined : "status"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? "true" : undefined}
    />
  );
}
