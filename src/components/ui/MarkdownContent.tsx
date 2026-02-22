'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="leading-relaxed mb-2 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1">{children}</ol>
          ),
          pre: ({ children }) => (
            <pre className="bg-surface-secondary border border-border-primary rounded-lg p-3 overflow-x-auto text-sm my-2">
              {children}
            </pre>
          ),
          code: ({ className: codeClassName, children }) => {
            // Fenced code blocks get a className like "language-js" from react-markdown
            const isBlock = Boolean(codeClassName);
            if (isBlock) {
              return (
                <code className="font-mono text-sm text-text-primary">
                  {children}
                </code>
              );
            }
            return (
              <code className="font-mono text-sm bg-surface-secondary px-1.5 py-0.5 rounded">
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
