import { Bell, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import { Button, Card, EmptyState, Spinner } from "../design-system";
import { NotificationItems, useOpenNotification } from "../components/NotificationBell";
import { useInbox, useMarkAllRead, useUnreadCount } from "../hooks/useNotifications";
import { getStoredUser } from "../utils/authStorage";
import { toVendorSlug } from "../utils/vendorPath";

export default function Notifications() {
  const navigate = useNavigate();
  const vendorCode = toVendorSlug(getStoredUser()?.vendorName);
  const inbox = useInbox({ limit: 20 });
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAllRead = useMarkAllRead();
  const openNotification = useOpenNotification(vendorCode);

  const items = inbox.data?.pages.flatMap((page) => page?.items || []) || [];

  let content;
  if (inbox.isLoading) {
    content = <div className="notif-state"><Spinner /></div>;
  } else if (inbox.isError) {
    content = (
      <EmptyState
        title="Couldn't load notifications"
        action={<Button variant="outline" onClick={() => inbox.refetch()}>Retry</Button>}
      />
    );
  } else if (items.length === 0) {
    content = (
      <EmptyState
        icon={<Bell size={24} />}
        title="No notifications yet"
        description="Updates on leave, expenses, payroll and other requests will show up here."
      />
    );
  } else {
    content = (
      <>
        <NotificationItems items={items} onOpen={openNotification} />
        {inbox.hasNextPage && (
          <div style={{ padding: 16, textAlign: "center" }}>
            <Button
              variant="outline"
              loading={inbox.isFetchingNextPage}
              onClick={() => inbox.fetchNextPage()}
            >
              Load more
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <MainLayout>
      <div className="wz-ds">
      <div style={{ marginBottom: 12 }}>
        <Button
          variant="secondary"
          icon={<ChevronLeft size={16} />}
          // Opened from a push link or a new tab there is no in-app page to return to.
          onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate(`/${vendorCode}/dashboard`))}
        >
          Back
        </Button>
      </div>
      <Card
        padded={false}
        title="All notifications"
        actions={
          <Button
            variant="secondary"
            size="sm"
            disabled={unreadCount === 0}
            loading={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Mark all read
          </Button>
        }
      >
        {content}
      </Card>
      </div>
    </MainLayout>
  );
}
