'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, EyeOff } from 'lucide-react';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export const MarkdownPreview = ({ content, className = '' }: MarkdownPreviewProps) => {
  const [isPreviewVisible, setIsPreviewVisible] = React.useState(true);

  if (!content || content.trim() === '') {
    return null;
  }

  // Preprocess content to fix common markdown formatting issues
  const preprocessContent = (text: string): string => {
    // Fix inline bullet points by ensuring they're on new lines
    let processed = text
      // Replace bullet characters that are not at the start of a line
      .replace(/([^\n])\s*[•·▸▹►]/g, '$1\n\n•')
      // Ensure bullet points at start of lines have proper spacing
      .replace(/^([•·▸▹►])/gm, '• ')
      // Fix multiple bullet points on same line
      .replace(/([•·▸▹►]\s*[^•\n]+)([•·▸▹►])/g, '$1\n$2')
      // Ensure there's a blank line before first bullet after text
      .replace(/([^\n])(\n[•·▸▹►])/g, '$1\n$2')
      // Convert common dash lists to bullets
      .replace(/^[-–—]\s+/gm, '• ')
      // Fix numbered lists that might be inline
      .replace(/([^\n])\s*(\d+[.)]\s)/g, '$1\n\n$2');
    
    // Fix inline tables - split table patterns that span multiple logical rows
    processed = processed.replace(/([^|\n]*\|[^|\n]+\|[^|\n]+\|[^|\n]+\|)([^|\n]*\|[^|\n]+\|[^|\n]+\|[^|\n]+\|)/g, 
      (match, firstPart, secondPart) => {
        // Split what appears to be two table rows on one line
        return firstPart.trim() + '\n' + secondPart.trim();
      }
    );
    
    // Additional fix for consecutive pipe sections
    processed = processed.replace(/(\|[^|\n]+\|)\s*(\|[^|\n]+\|)/g, '$1\n$2');
    
    // Fix tables that might be inline or missing separator rows
    processed = fixMarkdownTables(processed);
    
    return processed;
  };

  // Fix markdown tables
  const fixMarkdownTables = (text: string): string => {
    // Find potential table rows (lines with multiple | characters)
    const lines = text.split('\n');
    const processedLines: string[] = [];
    let inTable = false;
    let tableStartIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const pipeCount = (line.match(/\|/g) || []).length;
      
      // Detect table rows (at least 2 pipes for a minimum 3-column table)
      if (pipeCount >= 2 && line.includes('|')) {
        if (!inTable) {
          inTable = true;
          tableStartIndex = processedLines.length;
          
          // Check if this looks like a header row
          const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
          
          // If line doesn't start/end with |, add them
          let formattedLine = line;
          if (!line.startsWith('|')) formattedLine = '| ' + formattedLine;
          if (!line.endsWith('|')) formattedLine = formattedLine + ' |';
          
          processedLines.push(formattedLine);
          
          // Check if next line is already a separator
          const nextLine = lines[i + 1]?.trim() || '';
          const isSeparator = nextLine.includes('|') && nextLine.includes('-');
          
          if (!isSeparator && cells.length > 0) {
            // Add separator row
            const separator = '|' + cells.map(() => '---').join('|') + '|';
            processedLines.push(separator);
          }
        } else {
          // Format table row
          let formattedLine = line;
          if (!line.startsWith('|')) formattedLine = '| ' + formattedLine;
          if (!line.endsWith('|')) formattedLine = formattedLine + ' |';
          processedLines.push(formattedLine);
        }
      } else {
        // Not a table row
        if (inTable) {
          inTable = false;
        }
        processedLines.push(lines[i]);
      }
    }
    
    return processedLines.join('\n');
  };

  const processedContent = preprocessContent(content);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Article Preview</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Rendered View
          </span>
        </div>
        
        <button
          onClick={() => setIsPreviewVisible(!isPreviewVisible)}
          className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {isPreviewVisible ? (
            <>
              <EyeOff className="w-4 h-4" />
              <span>Hide Preview</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span>Show Preview</span>
            </>
          )}
        </button>
      </div>

      {/* Preview Content */}
      {isPreviewVisible && (
        <div className="p-6 bg-gray-50">
          <div className="bg-white rounded-lg border p-8 shadow-sm">
            <div className="prose prose-gray prose-lg max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                // Custom styling for different elements
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-gray-200">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="text-gray-700 leading-relaxed mb-4 text-base">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-900">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-gray-800">
                    {children}
                  </em>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-outside ml-6 mb-4 space-y-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside ml-6 mb-4 space-y-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-gray-700 leading-relaxed">
                    {children}
                  </li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500 bg-blue-50 pl-6 py-4 my-6 italic">
                    <div className="text-gray-700">
                      {children}
                    </div>
                  </blockquote>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-gray-100 text-red-600 px-2 py-1 rounded text-sm font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-gray-100 border border-gray-300 rounded-lg p-4 text-sm font-mono overflow-x-auto">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-gray-100 border border-gray-300 rounded-lg p-4 my-4 overflow-x-auto">
                    {children}
                  </pre>
                ),
                a: ({ href, children }) => (
                  <a 
                    href={href} 
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                hr: () => (
                  <hr className="border-gray-300 my-8" />
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-6">
                    <table className="min-w-full border border-gray-300 border-collapse">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-gray-50">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="bg-white">
                    {children}
                  </tbody>
                ),
                tr: ({ children }) => (
                  <tr className="border-b border-gray-200">
                    {children}
                  </tr>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-300 last:border-r-0">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-300 last:border-r-0">
                    {children}
                  </td>
                ),
                }}
              >
                {processedContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};