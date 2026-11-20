import type { ChequeDto } from '../assets/@types/cheque.types';

export interface ChequeStore {
  all(): readonly ChequeDto[];
  findById(id: string): ChequeDto | null;
  prepend(dto: ChequeDto): void;
  replace(id: string, dto: ChequeDto): void;
  nextId(): string;
}

function cloneChequeDto(dto: ChequeDto): ChequeDto {
  return {
    ...dto,
    amount: { ...dto.amount },
  };
}

export function createChequeStore(initialDtos: readonly ChequeDto[]): ChequeStore {
  const dtos = initialDtos.map(cloneChequeDto);
  let idSequence = dtos.length;

  return {
    all: () => dtos,
    findById: (id) => dtos.find((dto) => dto.id === id) ?? null,
    prepend: (dto) => {
      dtos.unshift(dto);
    },
    replace: (id, dto) => {
      const index = dtos.findIndex((current) => current.id === id);
      if (index >= 0) dtos[index] = dto;
    },
    nextId: () => {
      let id = '';

      do {
        idSequence += 1;
        id = `cheque-${String(1000 + idSequence).padStart(4, '0')}`;
      } while (dtos.some((dto) => dto.id === id));

      return id;
    },
  };
}
