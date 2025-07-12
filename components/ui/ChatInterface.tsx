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
}

export const ChatInterface = ({ 
  conversation, 
  onSendMessage, 
  isLoading = false,
  height = 400,
  onHeightChange 
}: ChatInterfaceProps) => {
  const [input, setInput] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when conversation updates or when loading
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      const newHeight = Math.min(Math.max(startHeight + (startY - e.clientY), 300), 1000);
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
      {/* Resize Handle */}
      <div 
        className={`h-2 bg-gray-100 cursor-row-resize flex items-center justify-center hover:bg-gray-200 transition-colors ${isResizing ? 'bg-blue-200' : ''}`}
        onMouseDown={handleResizeStart}
      >
        <div className="w-8 h-1 bg-gray-400 rounded"></div>
      </div>

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
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                    <ReactMarkdown 
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        p: ({ children }) => <p className="mb-3">{children}</p>,
                        ul: ({ children }) => <ul className="mb-3 ml-4">{children}</ul>,
                        li: ({ children }) => <li className="mb-1">{children}</li>
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
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};