import { cx } from "./utils";
import "./Badge.css";

const TONES = ["success", "warning", "error", "info", "neutral", "brand"];

export default function Badge({ tone = "neutral", className, children, ...rest }) {
  const safeTone = TONES.includes(tone) ? tone : "neutral";
  return (
    <span className={cx("wz-badge", `wz-badge--${safeTone}`, className)} {...rest}>
      {children}
    </span>
  );
}
