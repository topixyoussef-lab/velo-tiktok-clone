'use client';

import { useEffect, useRef, useCallback } from 'react';

type EventHandlers = {
  onMessages?: (data: any[]) => void;
  onNotifications?: (data: { notifications: any[]; unread_count: number }) => void;
  onCommunity?: (data: any[]) => void;
  onUnread?: (data: { unread_count: number }) => void;
};

export function useRealtime(type: string, handlers: EventHandlers, deps?: string) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let params = `type=${type}`;
    if (deps) params += `&${deps}`;

    const es = new EventSource(`/api/realtime?${params}`);
    esRef.current = es;

    es.addEventListener('messages', (e) => {
      try { handlersRef.current.onMessages?.(JSON.parse(e.data)); } catch {}
    });
    es.addEventListener('notifications', (e) => {
      try { handlersRef.current.onNotifications?.(JSON.parse(e.data)); } catch {}
    });
    es.addEventListener('community', (e) => {
      try { handlersRef.current.onCommunity?.(JSON.parse(e.data)); } catch {}
    });
    es.addEventListener('unread', (e) => {
      try { handlersRef.current.onUnread?.(JSON.parse(e.data)); } catch {}
    });

    es.onerror = () => {};

    return () => es.close();
  }, [type, deps]);
}
