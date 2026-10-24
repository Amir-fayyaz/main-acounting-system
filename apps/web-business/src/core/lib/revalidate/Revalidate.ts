'use server';
import { revalidateTag } from 'next/cache';

export async function revalidateTest(drId: string) {
  revalidateTag(`test-${drId}`, 'max');
}
