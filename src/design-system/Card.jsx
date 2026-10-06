import { useId } from "react";
import { cx } from "./utils";
import "./Card.css";

export default function Card({ title, subtitle, actions, children, className, padded = true, ...rest }) {
  const titleId = `wz-card-${useId().replace(/:/g, "")}-title`;
  const hasHeader = title || subtitle || actions;
  return (
    <section
      className={cx("wz-card", padded && "wz-card--padded", className)}
      aria-labelledby={title ? titleId : undefined}
      {...rest}
    >
      {hasHeader && (
        <header className="wz-card__header">
          <div className="wz-card__heading">
            {title && (
              <h3 id={titleId} className="wz-card__title">
                {title}
              </h3>
            )}
            {subtitle && <p className="wz-card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="wz-card__actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
