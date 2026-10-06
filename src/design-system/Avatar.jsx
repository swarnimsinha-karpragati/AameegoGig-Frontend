import { useState } from "react";
import { cx, getInitials } from "./utils";
import "./Avatar.css";

const SIZES = ["sm", "md", "lg"];

export default function Avatar({ name = "", src, size = "md", className }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const safeSize = SIZES.includes(size) ? size : "md";
  const classes = cx("wz-avatar", `wz-avatar--${safeSize}`, className);

  if (src && failedSrc !== src) {
    return <img className={classes} src={src} alt={name} onError={() => setFailedSrc(src)} />;
  }

  return (
    <span className={classes} role="img" aria-label={name || "User"}>
      <span aria-hidden="true">{getInitials(name) || "?"}</span>
    </span>
  );
}
