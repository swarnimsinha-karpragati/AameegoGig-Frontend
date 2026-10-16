import { useCallback, useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import FloatingMenu from "../components/FloatingMenu";
import { useMenuNavigation } from "./overlayHooks";
import { cx } from "./utils";
import "./DataTable.css";

const SKELETON_ROWS = 5;

export function resolveRowKey(row, index, rowKey) {
  if (typeof rowKey === "function") return rowKey(row, index);
  if (rowKey && row?.[rowKey] != null) return row[rowKey];
  return index;
}

export function rowActionsLabel(row, getRowLabel) {
  const label = typeof getRowLabel === "function" ? getRowLabel(row) : null;
  const text = label == null ? "" : String(label).trim();
  return text ? `Actions for ${text}` : "Row actions";
}

function RowActionsMenu({ anchorEl, actions, label, onClose }) {
  const menuRef = useRef(null);
  const { focusInitial, onKeyDown } = useMenuNavigation(menuRef);

  useEffect(() => {
    const handleMouseDown = (event) => {
      if (menuRef.current?.contains(event.target) || anchorEl?.contains(event.target)) return;
      onClose({ restoreFocus: false });
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose({ restoreFocus: true });
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorEl, onClose]);

  return (
    <FloatingMenu anchorEl={anchorEl} className="wz-ds wz-table-menu" onShown={focusInitial}>
      <div ref={menuRef} role="menu" aria-label={label} className="wz-table-menu__list" onKeyDown={onKeyDown}>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            role="menuitem"
            className={cx("wz-table-menu__item", action.danger && "wz-table-menu__item--danger")}
            disabled={action.disabled}
            onClick={() => {
              onClose({ restoreFocus: true });
              action.onClick?.();
            }}
          >
            {action.icon && (
              <span className="wz-table-menu__icon" aria-hidden="true">
                {action.icon}
              </span>
            )}
            {action.label}
          </button>
        ))}
      </div>
    </FloatingMenu>
  );
}

export default function DataTable({
  columns = [],
  rows = [],
  rowKey = "id",
  loading = false,
  emptyState,
  rowActions,
  getRowLabel,
  onRowClick,
  caption,
  className,
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const hasActions = typeof rowActions === "function";
  const columnCount = columns.length + (hasActions ? 1 : 0);
  const openRow =
    openMenu && hasActions && !loading
      ? rows.find((row, index) => resolveRowKey(row, index, rowKey) === openMenu.key)
      : undefined;
  const menuGone = openMenu != null && openRow === undefined;

  useEffect(() => {
    if (menuGone) setOpenMenu(null);
  }, [menuGone]);

  const closeMenu = useCallback(
    ({ restoreFocus } = {}) => {
      if (restoreFocus) openMenu?.anchorEl?.focus();
      setOpenMenu(null);
    },
    [openMenu]
  );

  const toggleMenu = (event, key) => {
    event.stopPropagation();
    const anchorEl = event.currentTarget;
    setOpenMenu((current) => (current?.key === key ? null : { key, anchorEl }));
  };

  const handleRowKeyDown = (event, row) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  };

  const renderBody = () => {
    if (loading) {
      return Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => (
        <tr key={`skeleton-${rowIndex}`} className="wz-table__row wz-table__row--skeleton">
          {Array.from({ length: columnCount }, (__, cellIndex) => (
            <td key={cellIndex} className="wz-table__cell">
              <span className="wz-table__skeleton" />
            </td>
          ))}
        </tr>
      ));
    }

    if (rows.length === 0) {
      return (
        <tr className="wz-table__row wz-table__row--empty">
          <td className="wz-table__cell wz-table__cell--empty" colSpan={columnCount || 1}>
            {emptyState ?? <p className="wz-table__empty-text">No records found</p>}
          </td>
        </tr>
      );
    }

    return rows.map((row, index) => {
      const key = resolveRowKey(row, index, rowKey);
      const clickable = typeof onRowClick === "function";
      return (
        <tr
          key={key}
          className={cx("wz-table__row", clickable && "wz-table__row--clickable")}
          onClick={clickable ? () => onRowClick(row) : undefined}
          onKeyDown={clickable ? (event) => handleRowKeyDown(event, row) : undefined}
          tabIndex={clickable ? 0 : undefined}
        >
          {columns.map((column) => (
            <td
              key={column.key}
              className={cx("wz-table__cell", column.align && `wz-table__cell--${column.align}`)}
            >
              {column.render ? column.render(row) : row?.[column.key] ?? "—"}
            </td>
          ))}
          {hasActions && (
            <td className="wz-table__cell wz-table__cell--actions">
              <button
                type="button"
                className="wz-table__kebab"
                aria-label={rowActionsLabel(row, getRowLabel)}
                aria-haspopup="menu"
                aria-expanded={openMenu?.key === key}
                onClick={(event) => toggleMenu(event, key)}
              >
                <MoreVertical aria-hidden="true" />
              </button>
            </td>
          )}
        </tr>
      );
    });
  };

  return (
    <div className={cx("wz-table-wrap", className)}>
      <table className="wz-table" aria-busy={loading || undefined}>
        {caption && <caption className="wz-sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cx("wz-table__head", column.align && `wz-table__cell--${column.align}`)}
                style={column.width != null ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
            {hasActions && (
              <th scope="col" className="wz-table__head wz-table__cell--actions">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>{renderBody()}</tbody>
      </table>
      {openRow !== undefined && (
        <RowActionsMenu
          anchorEl={openMenu.anchorEl}
          actions={rowActions(openRow) || []}
          label={rowActionsLabel(openRow, getRowLabel)}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
