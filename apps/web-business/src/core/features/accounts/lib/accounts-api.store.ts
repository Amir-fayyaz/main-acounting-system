import type { AccountDto } from '../assets/@types/account.types';

export interface AccountStore {
  all(): readonly AccountDto[];
  prepend(dto: AccountDto): void;
  nextId(): string;
}

function cloneAccountDto(dto: AccountDto): AccountDto {
  return {
    ...dto,
    balance: { ...dto.balance },
  };
}

export function createAccountStore(initialDtos: readonly AccountDto[]): AccountStore {
  const dtos = initialDtos.map(cloneAccountDto);
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
        id = `account-${String(1000 + idSequence).padStart(4, '0')}`;
      } while (dtos.some((dto) => dto.id === id));

      return id;
    },
  };
}
