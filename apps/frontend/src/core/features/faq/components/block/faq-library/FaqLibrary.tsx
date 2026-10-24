'use client';

import { useMemo, useState } from 'react';
import { faqCategories, faqEntries } from '@/core/features/faq/assets/mock/faq';
import type { FaqCategoryId } from '@/core/features/faq/assets/@types/faq';
import { FaqControls } from '@/core/features/faq/components/ui/faq-controls/FaqControls';
import { FaqResults } from '@/core/features/faq/components/ui/faq-results/FaqResults';
import { normalizeFaqQuery } from '@/core/features/faq/lib/normalize-faq-query';

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
    <>
      <FaqControls
        activeCategory={category}
        categories={faqCategories}
        query={query}
        onCategoryChange={setCategory}
        onQueryChange={setQuery}
      />
      <FaqResults entries={visibleEntries} labelOf={labelOf} onReset={reset} />
    </>
  );
}
