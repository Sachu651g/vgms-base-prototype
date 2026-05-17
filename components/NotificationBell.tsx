'use client';

import * as React from 'react';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

async function fetcher(url: string): Promise<NotificationsResponse> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return res.json() as Promise<NotificationsResponse>;
}

export function NotificationBell() {
  const { data, mutate } = useSWR<NotificationsResponse>(
    '/api/notifications',
    fetcher,
    { refreshInterval: 30000 }
  );

  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  async function handleNotificationClick(notification: Notification) {
    if (notification.read) return;

    try {
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'PUT',
      });
      // Optimistically update the cache
      await mutate(
        (current) => {
          if (!current) return current;
          return {
            notifications: current.notifications.map((n) =>
              n.id === notification.id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, current.unreadCount - 1),
          };
        },
        { revalidate: false }
      );
    } catch {
      // Revalidate on error to sync with server
      await mutate();
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        type="button"
        className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Bell SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-gray-500">{unreadCount} unread</span>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50" role="list">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-gray-500">
                No notifications yet
              </li>
            ) : (
              notifications.map((notification) => (
                <li key={notification.id} role="menuitem">
                  <button
                    type="button"
                    className={[
                      'w-full px-4 py-3 text-left transition-colors hover:bg-gray-50',
                      !notification.read ? 'bg-blue-50' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read && (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500"
                          aria-hidden="true"
                        />
                      )}
                      <div className={!notification.read ? '' : 'pl-4'}>
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
