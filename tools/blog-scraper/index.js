import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static('public'));

// Fetch and parse sitemap
async function fetchSitemap(url) {
  try {
    const response = await axios.get(url);
    const result = await parseStringPromise(response.data);
    
    const urls = [];
    if (result.urlset && result.urlset.url) {
      result.urlset.url.forEach(item => {
        urls.push({
          loc: item.loc[0],
          lastmod: item.lastmod ? item.lastmod[0] : null
        });
      });
    }
    
    return urls;
  } catch (error) {
    console.error('Error fetching sitemap:', error);
    throw error;
  }
}

// Scrape blog post content
async function scrapeBlogPost(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Try multiple selectors for different blog structures
    const selectors = {
      title: [
        'h1',
        '.entry-title',
        '.post-title',
        'article h1',
        '[class*="title"] h1'
      ],
      content: [
        '.entry-content',
        '.post-content',
        'article .content',
        '[class*="content"]',
        'main article'
      ],
      images: 'img'
    };
    
    // Find title
    let title = '';
    for (const selector of selectors.title) {
      const found = $(selector).first().text().trim();
      if (found) {
        title = found;
        break;
      }
    }
    
    // Find content
    let content = '';
    let contentElement = null;
    for (const selector of selectors.content) {
      const found = $(selector);
      if (found.length > 0) {
        contentElement = found.first();
        content = contentElement.html();
        break;
      }
    }
    
    // Find images
    const images = [];
    if (contentElement) {
      contentElement.find('img').each((i, elem) => {
        const src = $(elem).attr('src');
        const alt = $(elem).attr('alt') || '';
        if (src) {
          images.push({ src, alt });
        }
      });
    }
    
    // Also check for featured image
    const featuredImage = $('meta[property="og:image"]').attr('content');
    if (featuredImage && !images.some(img => img.src === featuredImage)) {
      images.unshift({ src: featuredImage, alt: 'Featured Image' });
    }
    
    return {
      url,
      title,
      content,
      images,
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    throw error;
  }
}

// No longer needed - we embed original URLs instead of downloading

// API Routes
app.get('/api/sitemap', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'Sitemap URL is required' });
  }
  
  try {
    const urls = await fetchSitemap(url);
    res.json({ urls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scrape', async (req, res) => {
  const { urls } = req.body;
  
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: 'URLs array is required' });
  }
  
  const results = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const outputDir = path.join(__dirname, 'output', `batch-${timestamp}-${Date.now()}`);
  
  // Create master index
  const masterIndex = {
    batchId: `batch-${timestamp}-${Date.now()}`,
    scrapedAt: new Date().toISOString(),
    totalUrls: urls.length,
    posts: []
  };
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      console.log(`Scraping ${i + 1}/${urls.length}: ${url}`);
      const data = await scrapeBlogPost(url);
      
      // Create unique folder name with index to avoid conflicts
      const baseSlug = url.split('/').filter(Boolean).pop() || 'post';
      const uniqueSlug = `${String(i + 1).padStart(3, '0')}-${baseSlug}`;
      const postDir = path.join(outputDir, uniqueSlug);
      await fs.ensureDir(postDir);
      
      // Save content as markdown
      const markdown = `# ${data.title}\n\n${data.content}`;
      await fs.writeFile(path.join(postDir, 'content.html'), data.content);
      await fs.writeFile(path.join(postDir, 'content.md'), markdown);
      
      // Process images - convert to absolute URLs and embed in HTML
      const processedImages = [];
      let updatedContent = data.content;
      
      for (let i = 0; i < data.images.length; i++) {
        const image = data.images[i];
        try {
          // Convert relative URLs to absolute
          const fullImageUrl = new URL(image.src, url).href;
          
          // Update the HTML content to use absolute URLs
          if (image.src.startsWith('http')) {
            // Already absolute, no change needed
            processedImages.push({
              ...image,
              src: image.src,
              originalSrc: image.src
            });
          } else {
            // Convert relative to absolute and update HTML
            updatedContent = updatedContent.replace(
              new RegExp(`src=["']${image.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g'),
              `src="${fullImageUrl}"`
            );
            
            processedImages.push({
              ...image,
              src: fullImageUrl,
              originalSrc: image.src
            });
          }
        } catch (err) {
          console.error(`Failed to process image: ${image.src}`, err);
          processedImages.push({
            ...image,
            src: image.src,
            originalSrc: image.src
          });
        }
      }
      
      // Update the data object with processed content
      data.content = updatedContent;
      
      // Save updated content with absolute image URLs
      await fs.writeFile(path.join(postDir, 'content.html'), updatedContent);
      await fs.writeFile(path.join(postDir, 'content.md'), `# ${data.title}\n\n${updatedContent}`);
      
      // Save metadata
      const metadata = {
        ...data,
        content: updatedContent,
        images: processedImages,
        outputDir: postDir,
        folderName: uniqueSlug,
        index: i + 1
      };
      await fs.writeJSON(path.join(postDir, 'metadata.json'), metadata, { spaces: 2 });
      
      // Add to master index
      masterIndex.posts.push({
        index: i + 1,
        folderName: uniqueSlug,
        url: url,
        title: data.title,
        imagesCount: processedImages.length,
        status: 'success'
      });
      
      results.push({
        url,
        status: 'success',
        title: data.title,
        imagesCount: processedImages.length,
        folderName: uniqueSlug
      });
      
    } catch (error) {
      // Add failed post to master index
      masterIndex.posts.push({
        index: i + 1,
        folderName: null,
        url: url,
        title: null,
        imagesCount: 0,
        status: 'error',
        error: error.message
      });
      
      results.push({
        url,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // Save master index
  await fs.writeJSON(path.join(outputDir, 'batch-index.json'), masterIndex, { spaces: 2 });
  
  // Create CSV for easy viewing
  const csvRows = [
    'Index,Folder,Title,URL,Images,Status,Error'
  ];
  
  masterIndex.posts.forEach(post => {
    const csvRow = [
      post.index,
      post.folderName || '',
      `"${(post.title || '').replace(/"/g, '""')}"`,
      post.url,
      post.imagesCount,
      post.status,
      `"${(post.error || '').replace(/"/g, '""')}"`
    ].join(',');
    csvRows.push(csvRow);
  });
  
  await fs.writeFile(path.join(outputDir, 'batch-summary.csv'), csvRows.join('\n'));
  
  res.json({ 
    results, 
    outputDir,
    batchId: masterIndex.batchId,
    summary: {
      total: masterIndex.totalUrls,
      successful: masterIndex.posts.filter(p => p.status === 'success').length,
      failed: masterIndex.posts.filter(p => p.status === 'error').length
    }
  });
});

app.listen(PORT, () => {
  console.log(`Blog scraper running at http://localhost:${PORT}`);
});