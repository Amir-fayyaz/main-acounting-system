import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import { AppConfigService } from '../config/app-config.service.js';
import type { ObjectStoragePort } from './object-storage.port.js';

const MISSING_CREDENTIALS_MESSAGE =
  'Object storage is not configured: set MINIO_ACCESS_KEY and MINIO_SECRET_KEY (see .env.example)';

/**
 * MinIO adapter for the object storage port (TECH-008 approved provider).
 *
 * The client is constructed without performing I/O, so the API process starts
 * regardless of storage availability; `checkAvailability` is what performs the
 * real round trip. Credentials are read from configuration only — never from
 * source code (Engineering Principles, rule 10).
 */
@Injectable()
export class MinioObjectStorageAdapter implements ObjectStoragePort, OnModuleInit {
  public readonly provider = 'minio';

  private readonly logger = new Logger(MinioObjectStorageAdapter.name);
  private readonly client?: MinioClient;
  private readonly configurationProblem?: string;

  constructor(config: AppConfigService) {
    const { endpoint, port, useSsl, accessKey, secretKey } = config.storage;

    if (!accessKey || !secretKey) {
      this.configurationProblem = MISSING_CREDENTIALS_MESSAGE;
      return;
    }

    this.client = new MinioClient({
      endPoint: endpoint,
      port,
      useSSL: useSsl,
      accessKey,
      secretKey,
    });
  }

  onModuleInit(): void {
    if (this.configurationProblem) {
      this.logger.warn(this.configurationProblem);
    }
  }

  async checkAvailability(): Promise<void> {
    if (!this.client) {
      throw new Error(this.configurationProblem ?? MISSING_CREDENTIALS_MESSAGE);
    }

    // listBuckets performs an authenticated request: it proves that the endpoint
    // is reachable and that the credentials are valid.
    await this.client.listBuckets();
  }
}
