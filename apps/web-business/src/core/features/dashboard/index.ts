// Public API for dashboard.
export { DashboardBlock } from './components/block/DashboardBlock';
export { DashboardCharts } from './components/block/DashboardCharts';
export { DashboardLists } from './components/block/DashboardLists';
export { useDashboard, type DashboardState } from './hook/useDashboard';
export type {
  CashflowMonth,
  DashboardMetric,
  DashboardSnapshot,
  DashboardTask,
  PaymentMethodShare,
} from './assets/@types';
