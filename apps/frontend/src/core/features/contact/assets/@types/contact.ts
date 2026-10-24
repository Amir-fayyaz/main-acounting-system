import type { LucideIcon } from 'lucide-react';

// Contracts shared by the contact blocks, UI components, and validation layer.

export interface ContactPath {
  icon: LucideIcon;
  title: string;
  description: string;
  linkLabel: string;
  href: string;
}

export interface ContactTopic {
  value: string;
  label: string;
}

export type ContactFieldId = 'name' | 'email' | 'phone' | 'message';
export type ContactFieldValues = Record<ContactFieldId, string>;
export type ContactFieldErrors = Partial<Record<ContactFieldId, string>>;
