// Contracts shared by the FAQ blocks and reusable controls.
export type FaqCategoryId = 'all' | 'start' | 'finance' | 'ai' | 'pricing' | 'data';

export interface FaqCategory {
  id: FaqCategoryId;
  label: string;
}

export interface FaqEntry {
  id: string;
  category: Exclude<FaqCategoryId, 'all'>;
  question: string;
  answer: string;
}
