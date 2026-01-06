import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import LaTeXRenderer from './LaTeXRenderer';

describe('LaTeXRenderer raw LaTeX fallback', () => {
  it('keeps explicit $...$ math behavior', () => {
    const { container } = render(
      <LaTeXRenderer content={'先写 $\\sqrt{2}$ 再写 $x$'} />
    );

    expect(container.innerHTML).toContain('katex');
    expect(container.textContent).toContain('先写');
    expect(container.textContent).toContain('再写');
  });

  it('renders raw \\sqrt and x^2 in plain text when no delimiters present', () => {
    const { container } = render(
      <LaTeXRenderer content={'根据\\sqrt{2}可得x^2+1'} />
    );

    expect(container.innerHTML).toContain('katex');
    expect(container.textContent).toContain('根据');
    expect(container.textContent).toContain('可得');
  });

  it('can disable fallback via enableAutoFix=false', () => {
    const { container } = render(
      <LaTeXRenderer
        content={'根据\\sqrt{2}可得x^2+1'}
        enableAutoFix={false}
      />
    );

    expect(container.innerHTML).not.toContain('katex');
    expect(container.innerHTML).toContain('\\sqrt');
  });

  it('preserves real newlines as line breaks', () => {
    const { container } = render(<LaTeXRenderer content={'第一行\n第二行'} />);

    expect(container.innerHTML).toContain('<br');
  });

  it('renders raw \\frac{1}{6} as a single token', () => {
    const { container } = render(<LaTeXRenderer content={'\\frac{1}{6}'} />);

    expect(container.innerHTML).toContain('katex');
    expect(container.innerHTML).not.toContain('\\frac{1}${6}');
  });
});
