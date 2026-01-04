
import React, { useMemo, memo } from 'react';
import katex from 'katex';

interface LaTeXRendererProps {
  content: string;
  className?: string;
}

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
const LaTeXRenderer: React.FC<LaTeXRendererProps> = memo(({ content, className = "" }) => {
  const renderedContent = useMemo(() => {
    // Ensure content is a string to prevent "content.split is not a function" errors
    const safeContent = String(content || "");
    if (!safeContent) return "";
    
    // Use safeContent in subsequent logic instead of content
    const processingContent = safeContent;

    // Regex to identify math segments. Handles display math ($$, \[) and inline math ($, \().
    // We use a simplified regex that works well across all modern browsers.
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

    return parts.map((part) => {
      if (!part) return "";

      // Display Math: $$...$$
      if (part.startsWith('$$') && part.endsWith('$$')) {
        return renderMath(part.slice(2, -2), true);
      }
      // Display Math: \[...\]
      if (part.startsWith('\\[') && part.endsWith('\\]')) {
        return renderMath(part.slice(2, -2), true);
      }
      // Inline Math: \(...\)
      if (part.startsWith('\\(') && part.endsWith('\\)')) {
        return renderMath(part.slice(2, -2), false);
      }
      // Inline Math: $...$
      if (part.startsWith('$') && part.endsWith('$')) {
        return renderMath(part.slice(1, -1), false);
      }

      // Plain text: escape HTML and preserve line breaks
      return fastEscapeHtml(part).replace(/\n/g, '<br/>');
    }).join('');
  }, [content]);

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
      });
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
