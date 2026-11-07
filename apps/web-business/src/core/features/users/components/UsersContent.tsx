'use client';

import { useState } from 'react';
import { SectionLayout } from '@repo/web/ui/components/custom/ui/wrapper/SectionLayout';
import { UsersToolbar } from './UsersToolbar';
import { UsersFilters } from './UsersFilters';
import { UsersTable } from './UsersTable';
import { MOCK_USERS } from '../assets/mock/users.mock';
import type { UserRole, UserStatus } from '../assets/@types/user';

export function UsersContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');

  const filteredUsers = MOCK_USERS.filter((user) => {
    const matchesSearch =
      searchTerm === '' ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCreateUser = () => {
    // Placeholder for create user action - to be implemented when real API is available
    console.log('Create user action triggered');
  };

  return (
    <SectionLayout>
      <UsersToolbar
        title="مدیریت کاربران"
        subtitle="مدیریت حساب کاربری و دسترسی کاربران"
        onCreateUser={handleCreateUser}
        userCount={MOCK_USERS.length}
      />

      <UsersFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="mt-6 border-t border-border/60 pt-6">
        <UsersTable
          users={filteredUsers}
          searchTerm={searchTerm}
        />
      </div>
    </SectionLayout>
  );
}
