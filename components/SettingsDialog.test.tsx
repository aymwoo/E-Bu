import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SettingsDialog from './SettingsDialog';

vi.mock('../services/apiService', () => {
  return {
    apiService: {
      getAIConfig: vi.fn(async () => ({
        activeProvider: 'GEMINI',
        providers: {},
        customProviders: [],
      })),
      getMigrationStatus: vi.fn(async () => ({
        dbPath: '/tmp/test.db',
        current: 0,
        latest: 1,
        pendingCount: 1,
        pending: [{ version: 1, name: 'test migration' }],
      })),
      migrateToLatest: vi.fn(async () => ({ count: 1, applied: [{ version: 1, name: 'test migration' }] })),
      saveAIConfig: vi.fn(async () => undefined),
    },
  };
});

describe('SettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and shows DB migration status on DB tab', async () => {
    const user = userEvent.setup();
    render(<SettingsDialog onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: '数据库' }));

    expect(await screen.findByText('/tmp/test.db')).toBeInTheDocument();
    expect(screen.getByText('无脑升级到最新')).toBeInTheDocument();
    expect(screen.getByText('待执行迁移')).toBeInTheDocument();
    expect(screen.getByText(/v1 - test migration/)).toBeInTheDocument();
  });
});
