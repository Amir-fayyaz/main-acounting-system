export function parseNumberInput(value: string): number {
  return Number(value.replace(/[٬,\s]/g, '')) || 0;
}
