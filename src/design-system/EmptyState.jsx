import { cx } from "./utils";
import "./EmptyState.css";

export default function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cx("wz-empty", className)}>
      {icon && (
        <span className="wz-empty__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {title && <p className="wz-empty__title">{title}</p>}
      {description && <p className="wz-empty__description">{description}</p>}
      {action && <div className="wz-empty__action">{action}</div>}
    </div>
  );
}
