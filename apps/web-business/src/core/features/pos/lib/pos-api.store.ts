import type { PosTerminalDto } from '../assets/@types/pos-terminal.types';

export interface PosTerminalStore {
  all(): readonly PosTerminalDto[];
  prepend(dto: PosTerminalDto): void;
  nextId(): string;
}

function clonePosTerminalDto(dto: PosTerminalDto): PosTerminalDto {
  return { ...dto };
}

export function createPosTerminalStore(
  initialDtos: readonly PosTerminalDto[],
): PosTerminalStore {
  const dtos = initialDtos.map(clonePosTerminalDto);
  let idSequence = dtos.length;

  return {
    all: () => dtos,
    prepend: (dto) => {
      dtos.unshift(dto);
    },
    nextId: () => {
      let id = '';

      do {
        idSequence += 1;
        id = `pos-${String(1000 + idSequence).padStart(4, '0')}`;
      } while (dtos.some((dto) => dto.id === id));

      return id;
    },
  };
}
