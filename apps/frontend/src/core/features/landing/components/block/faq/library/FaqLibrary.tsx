'use client';

import { useMemo, useState } from 'react';
import { faqCategories, faqEntries } from '@/core/features/landing/assets/mock/faq';
import type { FaqCategoryId } from '@/core/features/landing/assets/@types/faq';
import { FaqControls } from '@/core/features/landing/components/ui/faq/FaqControls';
import { FaqResults } from '@/core/features/landing/components/ui/faq/FaqResults';
import { normalizeFaqQuery } from '@/core/features/landing/lib/normalize-faq-query';

export function FaqLibrary() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FaqCategoryId>('all');

  const labels = useMemo(() => new Map(faqCategories.map((item) => [item.id, item.label])), []);
  const labelOf = (id: FaqCategoryId) => labels.get(id) ?? '';

  const visibleEntries = useMemo(() => {
    const needle = normalizeFaqQuery(query);
    return faqEntries.filter((entry) => {
      const matchesCategory = category === 'all' || entry.category === category;
      const searchableText = normalizeFaqQuery(
        `${labels.get(entry.category) ?? ''} ${entry.question} ${entry.answer}`,
      );
      return matchesCategory && searchableText.includes(needle);
    });
  }, [category, labels, query]);

  const reset = () => {
    setQuery('');
    setCategory('all');
  };

  return (
    <section className="pb-8">
      <div aria-label="جست‌وجو و پاسخ پرسش‌های متداول">
        <FaqControls
          activeCategory={category}
          categories={faqCategories}
          query={query}
          onCategoryChange={setCategory}
          onQueryChange={setQuery}
        />
        <FaqResults entries={visibleEntries} labelOf={labelOf} onReset={reset} />
      </div>
    </section>
  );
}
