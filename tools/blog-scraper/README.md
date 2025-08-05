# Linkio Blog Scraper

A local tool to scrape blog content and images from Linkio.com (or any website with a sitemap).

## Features

- Fetches URLs from sitemap.xml
- Interactive checkbox UI to select which posts to scrape
- Downloads full HTML content with embedded image URLs
- Saves content in organized folders with metadata
- Preserves original image URLs (no local downloads needed)

## Installation & Usage

1. Install dependencies:
```bash
cd tools/blog-scraper
npm install
```

2. Start the scraper:
```bash
npm start
```

3. Open your browser to: http://localhost:3001

4. Enter the sitemap URL (default: https://www.linkio.com/sitemap.xml)

5. Click "Fetch Sitemap" to load all URLs

6. Select the blog posts you want to scrape using checkboxes

7. Click "Scrape Selected Posts"

## Output Structure

The scraper creates an organized folder structure:

```
tools/blog-scraper/output/
└── batch-2025-08-05-1234567890/
    ├── batch-index.json        # Master index of all posts
    ├── batch-summary.csv       # Spreadsheet view
    ├── 001-post-slug-1/
    │   ├── content.html        # HTML with absolute image URLs
    │   ├── content.md          # Markdown version
    │   └── metadata.json       # Post + image metadata
    └── 002-post-slug-2/
        └── ...
```

## What Gets Scraped

- Post title
- Full HTML content with absolute image URLs
- Image metadata (URLs, alt text, etc.)
- Post metadata (URL, scrape date, etc.)

## Notes

- The scraper filters sitemap URLs to only show blog posts
- Images URLs are converted to absolute URLs and embedded in HTML
- Each post gets its own numbered folder to prevent conflicts
- Failed scrapes are logged but don't stop the process
- Master index and CSV summary for easy batch management

## Customization

To scrape a different site, just enter its sitemap URL. The scraper uses common blog selectors and should work with most WordPress sites.