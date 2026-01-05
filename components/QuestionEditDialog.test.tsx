import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import QuestionEditDialog from './QuestionEditDialog';

vi.mock('../services/apiService', () => {
  return {
    apiService: {
      updateQuestion: vi.fn(async (_id: string, updates: any) => ({
        id: 'q1',
        createdAt: new Date().toISOString(),
        ...updates,
        options: updates.options ?? [],
        knowledgePoints: updates.knowledgePoints ?? [],
        subject: updates.subject ?? '数学',
        difficulty: updates.difficulty ?? 3,
      })),
    },
  };
});

describe('QuestionEditDialog', () => {
  it('shows success toast after saving', async () => {
    const user = userEvent.setup();

    render(
      <QuestionEditDialog
        question={{
          id: 'q1',
          createdAt: new Date().toISOString(),
          content: '题目',
          options: [],
          answer: 'A',
          analysis: '解析',
          learningGuide: '建议',
          knowledgePoints: ['综合'],
          subject: '数学',
          difficulty: 3,
        } as any}
        onClose={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: '保存修改' }));

    expect(await screen.findByText('保存成功')).toBeInTheDocument();
  });
});
