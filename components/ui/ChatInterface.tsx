'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

// Basic interfaces - no external dependencies
interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: {
    prompt_cost: number;
    completion_cost: number;
    total_cost: number;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokenUsage?: TokenUsage;
}

interface ChatInterfaceProps {
  conversation: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
  height?: number;
  onHeightChange?: (height: number) => void;
  prefilledInput?: string;
  onPrefilledInputChange?: (value: string) => void;
}

export const ChatInterface = ({ 
  conversation, 
  onSendMessage, 
  isLoading = false,
  height = 600,
  onHeightChange,
  prefilledInput = '',
  onPrefilledInputChange
}: ChatInterfaceProps) => {
  const [input, setInput] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync with prefilled input
  useEffect(() => {
    if (prefilledInput && prefilledInput !== input) {
      setInput(prefilledInput);
      // Focus the textarea after loading
      setTimeout(() => {
        const textareaElement = document.querySelector('textarea[placeholder="Type your message..."]') as HTMLTextAreaElement;
        textareaElement?.focus();
        textareaElement?.setSelectionRange(textareaElement.value.length, textareaElement.value.length);
      }, 100);
      // Clear the prefilled input after setting it
      onPrefilledInputChange?.('');
    }
  }, [prefilledInput, input, onPrefilledInputChange]);
  
  // Auto-scroll to bottom when conversation updates or when loading
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'nearest',  // Don't scroll the page, just within the container
      inline: 'nearest'
    });
  }, [conversation, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await onSendMessage(message);
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = Math.min(Math.max(startHeight + (e.clientY - startY), 300), 1000);
      onHeightChange?.(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [height, onHeightChange]);

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Chat Messages */}
      <div 
        className="overflow-y-auto p-4 space-y-4"
        style={{ height: `${height}px` }}
      >
        {conversation.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>Start your conversation below</p>
          </div>
        ) : (
          conversation.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {message.role === 'assistant' ? (
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-table:my-4">
                    <ReactMarkdown 
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        p: ({ children }) => <p className="mb-3">{children}</p>,
                        ul: ({ children }) => <ul className="mb-3 ml-4">{children}</ul>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-4">
                            <table className="min-w-full border-collapse border border-gray-300 bg-white">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-gray-50">{children}</thead>
                        ),
                        tbody: ({ children }) => (
                          <tbody className="bg-white">{children}</tbody>
                        ),
                        tr: ({ children }) => (
                          <tr className="border-b border-gray-200">{children}</tr>
                        ),
                        th: ({ children }) => (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300 last:border-r-0">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300 last:border-r-0">
                            {children}
                          </td>
                        )
                      }}
                    >
                      {message.content
                        // Convert bullet points to markdown
                        .replace(/^•\s/gm, '- ')
                        // Ensure proper line breaks for markdown
                        .replace(/\n(?!\n)/g, '  \n')
                      }
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                )}
                
                {/* Token usage display */}
                {message.tokenUsage && (
                  <div className="text-xs mt-2 opacity-75">
                    <div>Tokens: {message.tokenUsage.total_tokens}</div>
                    <div>Cost: {formatCost(message.tokenUsage.cost.total_cost)}</div>
                  </div>
                )}
                
                <div className="text-xs mt-1 opacity-75">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-gray-600">AI is thinking...</span>
            </div>
          </div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        <div className="flex space-x-3 items-end">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={isLoading}
              rows={input.split('\n').length < 6 ? Math.max(1, input.split('\n').length) : 6}
              style={{ minHeight: '40px', maxHeight: '150px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="text-xs text-gray-500 mt-1">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 h-10"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Resize Handle - at bottom for intuitive dragging */}
      <div 
        className={`h-2 bg-gray-100 cursor-row-resize flex items-center justify-center hover:bg-gray-200 transition-colors ${isResizing ? 'bg-blue-200' : ''}`}
        onMouseDown={handleResizeStart}
      >
        <div className="w-8 h-1 bg-gray-400 rounded"></div>
      </div>
    </div>
  );
};