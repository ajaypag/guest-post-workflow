import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || !filename.endsWith('.sql')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Read migration file
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const filePath = path.join(migrationsDir, filename);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Add syntax highlighting hints
      const highlighted = addSyntaxHighlighting(content);
      
      return NextResponse.json({
        filename,
        content,
        highlighted,
        lines: content.split('\n').length,
        size: Buffer.byteLength(content, 'utf8'),
        success: true
      });
      
    } catch (error) {
      return NextResponse.json(
        { error: `Migration file not found: ${filename}` },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Failed to fetch migration content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch migration content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function addSyntaxHighlighting(content: string): string {
  // This is a simple version - in production you might use a proper SQL parser
  let highlighted = content;
  
  // Highlight SQL keywords
  const keywords = [
    'CREATE', 'TABLE', 'INDEX', 'UNIQUE', 'ALTER', 'ADD', 'COLUMN', 'DROP',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'FROM', 'WHERE',
    'SELECT', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS',
    'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CASCADE', 'CONSTRAINT',
    'NOT', 'NULL', 'DEFAULT', 'IF', 'EXISTS', 'BEGIN', 'COMMIT', 'ROLLBACK',
    'TRIGGER', 'FUNCTION', 'PROCEDURE', 'RETURNS', 'LANGUAGE', 'DECLARE',
    'VARCHAR', 'TEXT', 'INTEGER', 'BIGINT', 'BOOLEAN', 'TIMESTAMP', 'DATE',
    'UUID', 'JSONB', 'ARRAY', 'SERIAL', 'DECIMAL', 'NUMERIC'
  ];
  
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    highlighted = highlighted.replace(regex, `<span class="keyword">${keyword}</span>`);
  });
  
  // Highlight strings
  highlighted = highlighted.replace(/'([^']*)'/g, '<span class="string">\'$1\'</span>');
  
  // Highlight comments
  highlighted = highlighted.replace(/(--.*$)/gm, '<span class="comment">$1</span>');
  highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
  
  return highlighted;
}