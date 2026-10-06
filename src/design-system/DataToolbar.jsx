import { Search } from "lucide-react";
import { cx } from "./utils";
import "./DataToolbar.css";

export default function DataToolbar({ search, filters, actions, className }) {
  return (
    <div className={cx("wz-toolbar", className)}>
      {(search || actions) && (
        <div className="wz-toolbar__row">
          {search && (
            <div className="wz-toolbar__search">
              <span className="wz-toolbar__search-icon" aria-hidden="true">
                <Search />
              </span>
              <input
                type="search"
                className="wz-toolbar__search-input"
                value={search.value ?? ""}
                onChange={(event) => search.onChange?.(event.target.value)}
                placeholder={search.placeholder ?? "Search"}
                aria-label={search.ariaLabel ?? search.placeholder ?? "Search"}
              />
            </div>
          )}
          {actions && <div className="wz-toolbar__actions">{actions}</div>}
        </div>
      )}
      {filters && <div className="wz-toolbar__filters">{filters}</div>}
    </div>
  );
}
