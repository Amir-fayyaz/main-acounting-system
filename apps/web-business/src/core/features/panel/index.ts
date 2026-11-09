// Public API for panel. This feature is a shell that will be slimmed down over time.
// Domain modules must migrate out to their own features (see STRUCTURE.md).

// Layout & shell components
export { AccountingPanelLayout } from './components/block/layout/AccountingPanelLayout';
export { PanelPlaceholder } from './components/block/placeholder/PanelPlaceholder';

// Panel-wide UI helpers (candidates for features/shared later)
export { ListPage } from './components/ui/ListPage';
export { ListToolbar } from './components/ui/ListToolbar';
export { PageHeader } from './components/ui/PageHeader';
export { StatsRow } from './components/ui/StatsRow';
export { StatusFilter } from './components/ui/StatusFilter';
export { PanelLogoutControl } from './components/ui/PanelLogoutControl';

// Panel-wide hooks (candidates for features/shared later)
export { useListQuery } from './hooks/useListQuery';
export { useStatusFilter } from './hooks/useStatusFilter';

// Navigation mock (panel-specific)
export * from './assets/mock/navigation';
