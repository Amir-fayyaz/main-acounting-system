import { Module } from '@nestjs/common';
import { MinioObjectStorageAdapter } from './minio-object-storage.adapter.js';
import { OBJECT_STORAGE } from './storage.tokens.js';

/**
 * Object storage infrastructure.
 *
 * The port token is bound to the MinIO adapter so a provider can be replaced
 * without touching the consumers (ADR-007), and the bucket itself is provisioned
 * with the Documents module that owns file lifecycle.
 */
@Module({
  providers: [
    MinioObjectStorageAdapter,
    {
      provide: OBJECT_STORAGE,
      useExisting: MinioObjectStorageAdapter,
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
