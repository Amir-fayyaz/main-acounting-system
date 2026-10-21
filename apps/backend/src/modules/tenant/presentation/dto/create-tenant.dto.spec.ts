import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateTenantDto } from './create-tenant.dto.js';
import { UpdateTenantDto } from './update-tenant.dto.js';

describe('CreateTenantDto validation', () => {
  it('accepts a non-empty name within max length', async () => {
    const dto = plainToInstance(CreateTenantDto, { name: 'Acme Trading Co.' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an empty name', async () => {
    const dto = plainToInstance(CreateTenantDto, { name: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a missing name', async () => {
    const dto = plainToInstance(CreateTenantDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateTenantDto validation', () => {
  it('requires name and expectedRevision', async () => {
    const dto = plainToInstance(UpdateTenantDto, { name: 'Renamed', expectedRevision: 1 });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects expectedRevision below 1', async () => {
    const dto = plainToInstance(UpdateTenantDto, { name: 'Renamed', expectedRevision: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects empty name', async () => {
    const dto = plainToInstance(UpdateTenantDto, { name: '', expectedRevision: 1 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
