export interface ReportItem {
  id: string;
  label: string;
}

export interface ReportGroup {
  id: string;
  title: string;
  items: readonly ReportItem[];
}

export interface ReportDateRange {
  from: string;
  to: string;
}
