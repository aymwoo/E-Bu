
import React, { useMemo, memo } from 'react';
import katex from 'katex';

interface LaTeXRendererProps {
  content: string;
  className?: string;
  enableAutoFix?: boolean;
}

const SHOULD_ENABLE_RAW_LATEX_FALLBACK_STORAGE_KEY = 'latexAutofixEnabled';

const getPersistedAutoFixSetting = (): boolean => {
  try {
    const raw = localStorage.getItem(SHOULD_ENABLE_RAW_LATEX_FALLBACK_STORAGE_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
};

/**
 * Fast string-based HTML escaping to avoid expensive DOM operations in loops.
 */
const fastEscapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Optimized LaTeX Renderer component.
 * Uses a robust splitting strategy and KaTeX for high-performance math rendering.
 */
const LaTeXRenderer: React.FC<LaTeXRendererProps> = memo(
  ({ content, className = "", enableAutoFix }) => {

  const renderedContent = useMemo(() => {
    // Ensure content is a string to prevent "content.split is not a function" errors
    const safeContent = String(content || "");
    if (!safeContent) return "";

    const processingContent = safeContent;

    const hasExplicitMathDelimiters =
      processingContent.includes('$$') ||
      processingContent.includes('\\(') ||
      processingContent.includes('\\[') ||
      /(^|[^\\])\$/.test(processingContent);

    const hasStrongRawLatexHints =
      /\\(frac|sqrt|times|cdot|pm|leq|geq|neq|approx|sin|cos|tan|log|ln)\b/.test(
        processingContent
      ) ||
      /(?<!\\)\b[A-Za-z0-9]+(?:\^[A-Za-z0-9]+|_\{[^{}]*\}|_[A-Za-z0-9]+)/.test(
        processingContent
      );

    const effectiveEnableAutoFix =
      enableAutoFix ?? getPersistedAutoFixSetting();

    const enableRawLatexFallback =
      effectiveEnableAutoFix && !hasExplicitMathDelimiters && hasStrongRawLatexHints;

    // Regex to identify math segments. Handles display math ($$, \\[) and inline math ($, \\().
    // Note: Escaped dollars (\$) are handled by the splitting logic naturally.
    const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\(.*?\\\)|(?<!\\)\$.*?\$)/g;

    // Fallback for browsers that don't support negative lookbehind (older Safari)
    let parts: string[];
    try {
      parts = processingContent.split(regex);
    } catch (e) {
      // Basic fallback if lookbehind fails
      const fallbackRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\(.*?\\\))/g;
      parts = processingContent.split(fallbackRegex);
    }

    const rawFracPattern = /\\frac\s*\{[^{}]*\}\s*\{[^{}]*\}/g;
    const rawLatexCommandPattern =
      /\\(?:frac|sqrt|times|cdot|pm|leq|geq|neq|approx|pi|theta|sin|cos|tan|log|ln)\b(?:\s*\{[^{}]*\})?/g;
    const rawSimpleExprPattern =
      /(?<!\\)\b[A-Za-z0-9]+(?:\^[A-Za-z0-9]+|_\{[^{}]*\}|_[A-Za-z0-9]+)(?:\s*[+\-*/]\s*\d+)?/g;

    const renderPlainText = (text: string) => {
      if (!enableRawLatexFallback) {
        return fastEscapeHtml(text).replace(/\n/g, '<br/>');
      }

      const segments: string[] = [];
      const contentText = String(text || '');
      const combinedPattern = new RegExp(
        `${rawFracPattern.source}|${rawLatexCommandPattern.source}|${rawSimpleExprPattern.source}`,
        'g'
      );

      let lastIndex = 0;
      for (const m of contentText.matchAll(combinedPattern)) {
        if (m.index == null) continue;

        const start = m.index;
        const end = start + m[0].length;
        if (start > lastIndex) {
          segments.push(fastEscapeHtml(contentText.slice(lastIndex, start)).replace(/\n/g, '<br/>'));
        }

        const token = m[0];
        if (/^\\[ntr]$/.test(token)) {
          segments.push(fastEscapeHtml(token));
        } else {
          segments.push(renderMath(token, false));
        }

        lastIndex = end;
      }

      if (lastIndex < contentText.length) {
        segments.push(
          fastEscapeHtml(contentText.slice(lastIndex)).replace(/\n/g, '<br/>')
        );
      }

      return segments.join('');
    };

    return parts
      .map((part) => {
        if (!part) return "";

        // Display Math: $$...$$
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return renderMath(part.slice(2, -2), true);
        }
        // Display Math: \\[...\\]
        if (part.startsWith('\\[') && part.endsWith('\\]')) {
          return renderMath(part.slice(2, -2), true);
        }
        // Inline Math: \\(...\\)
        if (part.startsWith('\\(') && part.endsWith('\\)')) {
          return renderMath(part.slice(2, -2), false);
        }
        // Inline Math: $...$
        if (part.startsWith('$') && part.endsWith('$')) {
          return renderMath(part.slice(1, -1), false);
        }

        return renderPlainText(part);
      })
      .join('');
  }, [content, enableAutoFix]);

  /**
   * Helper to render math using KaTeX with optimized settings.
   */
  function renderMath(formula: string, displayMode: boolean): string {
    try {
      return katex.renderToString(formula, {
        displayMode,
        throwOnError: false,
        output: 'html',
        strict: false,
        trust: true,
        macros: {
          // Add common macros here if needed for consistency
          "\\RR": "\\mathbb{R}",
          "\\NN": "\\mathbb{N}"
        }
  }
);
    } catch (e) {
      console.warn("KaTeX render error for formula:", formula, e);
      // Return escaped raw formula as fallback
      return `<code class="bg-red-50 text-red-600 px-1 rounded">${fastEscapeHtml(formula)}</code>`;
    }
  }

  return (
    <div 
      className={`latex-container ${className} prose prose-slate max-w-none leading-relaxed transition-opacity duration-200`}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
});

// Set display name for debugging
LaTeXRenderer.displayName = 'LaTeXRenderer';

export default LaTeXRenderer;
