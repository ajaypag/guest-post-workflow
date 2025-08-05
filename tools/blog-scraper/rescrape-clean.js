import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract clean text content from a page
async function extractCleanContent(url) {
  try {
    console.log(`Extracting clean content from: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('script, style, noscript, iframe, svg').remove();
    $('.elementor-widget-sidebar, .sidebar, .widget-area').remove();
    $('.menu, .navigation, .nav, header, footer').remove();
    
    // Find the main content
    let contentElement = null;
    const contentSelectors = [
      '.elementor-widget-text-editor',
      '.entry-content',
      '.post-content', 
      'article .content',
      '[class*="content"]',
      'main article',
      'article'
    ];
    
    for (const selector of contentSelectors) {
      const found = $(selector);
      if (found.length > 0) {
        contentElement = found.first();
        break;
      }
    }
    
    if (!contentElement) {
      contentElement = $('body');
    }
    
    // Extract title
    let title = $('h1').first().text().trim() || 
                $('title').text().trim() || 
                'Untitled';
    
    // Extract structured content
    const sections = [];
    let currentSection = { title: '', content: [] };
    
    contentElement.find('h1, h2, h3, h4, h5, h6, p, ul, ol').each((i, elem) => {
      const tagName = elem.tagName.toLowerCase();
      const text = $(elem).text().trim();
      
      if (!text || text.length < 3) return;
      
      if (tagName.startsWith('h')) {
        // Save previous section if it has content
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        // Start new section
        currentSection = {
          title: text,
          level: parseInt(tagName[1]),
          content: []
        };
      } else if (tagName === 'p') {
        currentSection.content.push(text);
      } else if (tagName === 'ul' || tagName === 'ol') {
        const listItems = [];
        $(elem).find('li').each((j, li) => {
          const liText = $(li).text().trim();
          if (liText) {
            listItems.push('• ' + liText);
          }
        });
        if (listItems.length > 0) {
          currentSection.content.push(listItems.join('\n'));
        }
      }
    });
    
    // Don't forget the last section
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }
    
    // Extract meta description
    const metaDescription = $('meta[name="description"]').attr('content') || 
                           $('meta[property="og:description"]').attr('content') || 
                           '';
    
    // Extract featured image
    const featuredImage = $('meta[property="og:image"]').attr('content') || '';
    
    return {
      url,
      title,
      metaDescription,
      featuredImage,
      sections,
      extractedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`Error extracting from ${url}:`, error.message);
    return null;
  }
}

// Process existing scraped pages
async function processExistingPages() {
  const batchDir = path.join(__dirname, 'output', 'batch-2025-08-05-1754413044215');
  const pages = await fs.readdir(batchDir);
  
  const cleanOutputDir = path.join(__dirname, 'output', 'clean-content');
  await fs.ensureDir(cleanOutputDir);
  
  for (const page of pages) {
    if (page.startsWith('batch-')) continue;
    
    const metadataFile = path.join(batchDir, page, 'metadata.json');
    if (await fs.pathExists(metadataFile)) {
      try {
        const metadata = await fs.readJson(metadataFile);
        const url = metadata.url;
        
        if (url) {
          const cleanContent = await extractCleanContent(url);
          if (cleanContent) {
            const outputFile = path.join(cleanOutputDir, `${page}.json`);
            await fs.writeJson(outputFile, cleanContent, { spaces: 2 });
            console.log(`✓ Processed: ${page}`);
          }
        }
      } catch (error) {
        console.error(`Error processing ${page}:`, error.message);
      }
    }
  }
  
  console.log('Done processing all pages!');
}

// Run the processor
processExistingPages().catch(console.error);