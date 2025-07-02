#!/usr/bin/env node

// Script to find PostgreSQL database connection information in Coolify

const COOLIFY_URL = process.env.COOLIFY_URL || 'http://localhost:8000';
const DB_SERVICE_NAME = 'postgresql-database-ksc80soo8ks8000gcsk0ccw8';

console.log(`
===========================================
Finding PostgreSQL Database Connection Info
===========================================
Database: ${DB_SERVICE_NAME}
Coolify URL: ${COOLIFY_URL}
===========================================
`);

console.log(`
Please use Puppeteer to:

1. Navigate to: ${COOLIFY_URL}
2. Look for the PostgreSQL service: ${DB_SERVICE_NAME}
3. Click on it to view details
4. Look for any of these connection details:
   - Connection String / Internal Connection String
   - Internal URL / Database URL
   - Host, Port, Database, Username, Password
   - Environment variables containing connection info
   
The connection string should look something like:
postgresql://username:password@host:port/database

Or for internal Docker connections:
postgresql://username:password@${DB_SERVICE_NAME}:5432/database
`);

// Helper to extract connection info from text
function extractConnectionInfo(text) {
  const info = {
    urls: [],
    host: null,
    port: null,
    database: null,
    username: null,
    password: null
  };
  
  // Find PostgreSQL URLs
  const urlRegex = /postgres(?:ql)?:\/\/[^\s"']+/gi;
  const urls = text.match(urlRegex);
  if (urls) {
    info.urls = urls;
  }
  
  // Find individual components
  const hostRegex = /(?:host|hostname)[\s:=]+([^\s,;]+)/i;
  const portRegex = /(?:port)[\s:=]+(\d+)/i;
  const dbRegex = /(?:database|db)[\s:=]+([^\s,;]+)/i;
  const userRegex = /(?:user|username)[\s:=]+([^\s,;]+)/i;
  const passRegex = /(?:password|pass)[\s:=]+([^\s,;]+)/i;
  
  const hostMatch = text.match(hostRegex);
  if (hostMatch) info.host = hostMatch[1];
  
  const portMatch = text.match(portRegex);
  if (portMatch) info.port = portMatch[1];
  
  const dbMatch = text.match(dbRegex);
  if (dbMatch) info.database = dbMatch[1];
  
  const userMatch = text.match(userRegex);
  if (userMatch) info.username = userMatch[1];
  
  const passMatch = text.match(passRegex);
  if (passMatch) info.password = passMatch[1];
  
  return info;
}

// Export for use in other scripts
module.exports = { extractConnectionInfo, DB_SERVICE_NAME };