import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";

import "./NotificationBell.css";
import { Badge, Spinner } from "../design-system";
import { useToast } from "./Toast";
import {
  useInbox,
  useMarkAllRead,
  useMarkRead,
  useNotificationsUpdatedListener,
  useUnreadCount,
} from "../hooks/useNotifications";
import { requestNavigation } from "../utils/navigationGuard";
import { enableWebPush, syncWebPush, webPushPermission } from "../utils/webPush";

const timeAgo = (iso) => {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
};

/** Marks an item read and opens its vendor-relative `path`. Shared by the bell and the Notifications page. */
export function useOpenNotification(vendorCode) {
  const navigate = useNavigate();
  const markRead = useMarkRead();

  return (item) => {
    if (!item.readAt) markRead.mutate(item._id);
    if (item.path) requestNavigation(() => navigate(`/${vendorCode}${item.path}`));
  };
}

export function NotificationItems({ items, onOpen }) {
  return (
    <ul className="notif-list">
      {items.map((item) => (
        <li key={item._id}>
          <button
            type="button"
            className={`notif-item${item.readAt ? "" : " notif-item--unread"}`}
            onClick={() => onOpen(item)}
          >
            <span className="notif-item__title">{item.title}</span>
            {item.body && <span className="notif-item__body">{item.body}</span>}
            <span className="notif-item__time">{timeAgo(item.createdAt)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function NotificationBell({ vendorCode }) {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(webPushPermission);
  const rootRef = useRef(null);
  const navigate = useNavigate();
  const { info: toastInfo } = useToast();

  const { data: unreadCount = 0 } = useUnreadCount();
  const inbox = useInbox({ limit: 10, enabled: open });
  const markAllRead = useMarkAllRead();
  const openNotification = useOpenNotification(vendorCode);
  useNotificationsUpdatedListener();

  const items = inbox.data?.pages?.[0]?.items || [];

  useEffect(() => {
    syncWebPush();
  }, []);

  // Foreground web push: the system shows nothing while the tab is focused, so toast it.
  useEffect(() => {
    const onPush = (event) => {
      const notification = event.detail?.notification;
      if (notification?.title) toastInfo(notification.title);
    };
    window.addEventListener("notifications-updated", onPush);
    return () => window.removeEventListener("notifications-updated", onPush);
  }, [toastInfo]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleEnableAlerts = async () => {
    await enableWebPush();
    setPermission(webPushPermission());
  };

  return (
    <div className="wz-ds notif-bell" ref={rootRef}>
      <button
        type="button"
        className="notif-bell__button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <Badge tone="error" className="notif-bell__count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-panel__header">
            <span className="notif-panel__title">Notifications</span>
            <button
              type="button"
              className="notif-link"
              disabled={unreadCount === 0 || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </button>
          </div>

          {permission === "default" && (
            <button type="button" className="notif-link notif-panel__enable" onClick={handleEnableAlerts}>
              Enable desktop alerts
            </button>
          )}

          <div className="notif-panel__body">
            {inbox.isLoading ? (
              <div className="notif-state">
                <Spinner />
              </div>
            ) : inbox.isError ? (
              <p className="notif-state">Couldn't load notifications.</p>
            ) : items.length === 0 ? (
              <p className="notif-state">You're all caught up.</p>
            ) : (
              <NotificationItems
                items={items}
                onOpen={(item) => {
                  setOpen(false);
                  openNotification(item);
                }}
              />
            )}
          </div>

          <button
            type="button"
            className="notif-link notif-panel__footer"
            onClick={() => {
              setOpen(false);
              requestNavigation(() => navigate(`/${vendorCode}/notifications`));
            }}
          >
            View all
          </button>
        </div>
      )}
    </div>
  );
}
