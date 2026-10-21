'use client';

import { useMemo, useState } from 'react';
import FaqCount from './faqCount/FaqCount';
import FaqEmpty from './faqEmpty/FaqEmpty';
import FaqFilters from './faqFilters/FaqFilters';
import FaqItem from './faqItem/FaqItem';
import FaqSearch from './faqSearch/FaqSearch';
import { faqCategories, faqEntries } from './faqData';
import type { FaqCategory, FaqCategoryId, FaqEntry } from './faqData';

export interface FaqLibraryProps {
  categories?: FaqCategory[];
  entries?: FaqEntry[];
}

/**
 * نرمال‌سازی متن برای جست‌جو: حروف عربی → فارسی، نیم‌فاصله → فاصله، حذف فاصله‌های اضافه.
 * عبارت جستجو و متن هر پرسش هر دو با هین تابع مقایسه می‌شوند.
 */
export const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function FaqLibrary({ categories = faqCategories, entries = faqEntries }: FaqLibraryProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FaqCategoryId>('all');

  const labelOf = useMemo(() => {
    const map = new Map(categories.map((item) => [item.id, item.label]));
    return (id: FaqCategoryId) => map.get(id) ?? '';
  }, [categories]);

  const visible = useMemo(() => {
    const needle = normalize(query);

    return entries.filter((entry) => {
      const matchCategory = category === 'all' || entry.category === category;
      const haystack = normalize(`${labelOf(entry.category)} ${entry.question} ${entry.answer}`);

      return matchCategory && haystack.includes(needle);
    });
  }, [entries, category, query, labelOf]);

  const reset = () => {
    setQuery('');
    setCategory('all');
  };

  return (
    <>
      <div className="mx-auto mb-7 max-w-[780px]">
        <FaqSearch onChange={setQuery} value={query} />
        <FaqFilters active={category} categories={categories} onSelect={setCategory} />
      </div>

      <section aria-label="پرسش‌ها و پاسخ‌ها" className="mx-auto max-w-[900px] pb-[38px]">
        <FaqCount count={visible.length} />

        {visible.map((entry) => (
          <FaqItem categoryLabel={labelOf(entry.category)} entry={entry} key={entry.id} />
        ))}

        {visible.length === 0 && <FaqEmpty onReset={reset} />}
      </section>
    </>
  );
}

export default FaqLibrary;
