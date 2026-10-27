import { Bell } from "lucide-react";

import MainLayout from "../layouts/MainLayout";
import { Button, Card, EmptyState, Spinner } from "../design-system";
import { NotificationItems, useOpenNotification } from "../components/NotificationBell";
import { useInbox, useMarkAllRead, useUnreadCount } from "../hooks/useNotifications";
import { getStoredUser } from "../utils/authStorage";
import { toVendorSlug } from "../utils/vendorPath";

export default function Notifications() {
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
