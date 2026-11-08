export interface ReportDefinition {
  id: string;
  title: string;
  group: 'financial' | 'treasury' | 'sales-purchases' | 'management';
  description: string;
}
