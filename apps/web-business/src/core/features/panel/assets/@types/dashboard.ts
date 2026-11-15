export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
  status: 'success' | 'pending' | 'warning';
}
