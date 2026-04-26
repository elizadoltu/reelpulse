import type { WsStatus } from '@/types/index.js';

const COLOR: Record<WsStatus, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500',
  disconnected: 'bg-red-500',
};

const LABEL: Record<WsStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Disconnected',
};

export function WSStatusDot({ status }: { status: WsStatus }) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className={`inline-block h-2 w-2 rounded-full ${COLOR[status]}`} aria-hidden="true" />
      {LABEL[status]}
    </span>
  );
}
