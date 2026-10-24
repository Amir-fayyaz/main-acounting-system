import type { LandingIconName } from '@/core/features/landing/components/ui/icon/LandingIcon';

export interface BenefitItem {
  title: string;
  description: string;
}

export interface FlowStep {
  title: string;
  description: string;
  value: string;
  unit: string;
  icon: LandingIconName;
}

export interface WorkflowFlow {
  label: string;
  steps: readonly FlowStep[];
}

export interface WorkflowTab {
  key: string;
  label: string;
}

export interface WorkflowSectionData {
  id: string;
  eyebrow: string;
  title: {
    first: string;
    second: string;
  };
  description: string;
  benefits?: readonly BenefitItem[];
  cta?: {
    label: string;
    href: string;
  };
  boardTitle: string;
  tabsAriaLabel: string;
  tabs: readonly WorkflowTab[];
  flows: Record<string, WorkflowFlow>;
  securityLabel: string;
  footerCaption: string;
  panelAriaLabel: string;
}

export interface ReviewLine {
  label: string;
  value: string;
}

export interface AssistantPreviewData {
  ariaLabel: string;
  title: string;
  badge: string;
  userMessage: string;
  attachment: string;
  answer: {
    strong: string;
    text: string;
  };
  approvedAnswer: {
    strong: string;
    text: string;
  };
  reviewLines: readonly ReviewLine[];
  statusLabel: string;
  status: {
    pending: string;
    approved: string;
  };
  approvalMessages: {
    pending: string;
    approved: string;
  };
  actions: {
    approve: string;
    restart: string;
    manual: string;
    closeManual: string;
    toastApproved: string;
    toastReset: string;
  };
  manualReview: {
    title: string;
    note: string;
    lines: readonly ReviewLine[];
  };
  disclaimer: string;
}

export interface AssistantSectionData {
  id: string;
  eyebrow: string;
  title: {
    first: string;
    second: string;
  };
  description: string;
  benefits?: readonly BenefitItem[];
  tags?: readonly string[];
  quote?: string;
  callout?: string;
  preview: AssistantPreviewData;
}

export interface MiniCtaData {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}
