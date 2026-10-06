import { Module } from '@nestjs/common';

import { DatabaseModule, type Database } from '../../../infrastructure/database/database.module.js';
import {
  DATABASE,
  TRANSACTION_BOUNDARY,
} from '../../../infrastructure/database/database.tokens.js';
import { OutboxModule } from '../../../infrastructure/outbox/outbox.module.js';
import { OUTBOX_RECORDER } from '../../../infrastructure/outbox/outbox.tokens.js';
import type { TransactionBoundary } from '../../../shared/transaction/transaction-boundary.js';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js';
import { ChangeUserStatusUseCase } from '../application/use-cases/change-user-status.use-case.js';
import { GetUserUseCase } from '../application/use-cases/get-user.use-case.js';
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case.js';
import { USER_EVENT_RECORDER, USER_REPOSITORY } from '../application/user.tokens.js';
import type { UserEventRecorder } from '../application/ports/user-event-recorder.port.js';
import type { UserRepository } from '../domain/repositories/user.repository.js';
import { UsersController } from '../presentation/controllers/user.controller.js';
import { DrizzleUserRepository } from './persistence/drizzle-user.repository.js';

/**
 * The Identity module's User feature (IAM-002).
 *
 * It wires the module's own ports to their adapters and its use cases to the
 * shared infrastructure they need:
 *
 * - `USER_REPOSITORY` → `DrizzleUserRepository` (this module's table);
 * - `USER_EVENT_RECORDER` → the shared outbox recorder, so user events commit
 *   with the state change that raised them (SHR-006);
 * - `TRANSACTION_BOUNDARY` → the shared boundary the use cases open (SHR-005).
 *
 * The adapters stay behind their tokens, so the controller and use cases never
 * reach past a port — and the module owns its persistence, exposing the Drizzle
 * table and adapter to no one else (ADR-002 sections 8 and 12).
 */
@Module({
  imports: [DatabaseModule, OutboxModule],
  controllers: [UsersController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useFactory: (database: Database): UserRepository => new DrizzleUserRepository(database),
      inject: [DATABASE],
    },
    {
      // The outbox recorder already satisfies the application port structurally.
      provide: USER_EVENT_RECORDER,
      useExisting: OUTBOX_RECORDER,
    },
    {
      provide: CreateUserUseCase,
      useFactory: (
        repository: UserRepository,
        events: UserEventRecorder,
        boundary: TransactionBoundary,
      ) => new CreateUserUseCase(repository, events, boundary),
      inject: [USER_REPOSITORY, USER_EVENT_RECORDER, TRANSACTION_BOUNDARY],
    },
    {
      provide: GetUserUseCase,
      useFactory: (repository: UserRepository) => new GetUserUseCase(repository),
      inject: [USER_REPOSITORY],
    },
    {
      provide: UpdateUserUseCase,
      useFactory: (
        repository: UserRepository,
        events: UserEventRecorder,
        boundary: TransactionBoundary,
      ) => new UpdateUserUseCase(repository, events, boundary),
      inject: [USER_REPOSITORY, USER_EVENT_RECORDER, TRANSACTION_BOUNDARY],
    },
    {
      provide: ChangeUserStatusUseCase,
      useFactory: (
        repository: UserRepository,
        events: UserEventRecorder,
        boundary: TransactionBoundary,
      ) => new ChangeUserStatusUseCase(repository, events, boundary),
      inject: [USER_REPOSITORY, USER_EVENT_RECORDER, TRANSACTION_BOUNDARY],
    },
  ],
  // The user repository is exported to this module's own membership feature
  // (IAM-003) so it can confirm a membership references an existing user. It is
  // not an invitation to other modules: the boundary guard still forbids them
  // from importing this file.
  exports: [USER_REPOSITORY],
})
export class UserModule {}
