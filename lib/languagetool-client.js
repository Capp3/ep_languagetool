/**
 * LanguageTool API Client
 * Handles communication with LanguageTool API
 */

const http = require('http');
const https = require('https');
const url = require('url');

/**
 * Normalize LanguageTool response to consistent format
 * @param {object} response - Raw LanguageTool API response
 * @returns {object} Normalized response with matches array
 */
function normalizeResponse(response) {
  // LanguageTool API returns matches in a specific format
  // Ensure we always return a consistent structure
  return {
    matches: response.matches || [],
    language: response.language || {},
    software: response.software || {},
    warnings: response.warnings || {}
  };
}

/**
 * Check text using LanguageTool API
 * @param {string} text - Text to check
 * @param {string} language - Language code (e.g., 'en', 'de', 'fr')
 * @param {object} options - Additional options
 * @param {string} options.apiUrl - LanguageTool API URL
 * @param {number} options.timeout - Request timeout in milliseconds (default: 30000)
 * @param {number} options.maxTextLength - Maximum text length to check (default: 60000)
 * @returns {Promise<object>} Normalized LanguageTool response with matches
 */
async function checkText(text, language = 'en', options = {}) {
  const apiUrl = options.apiUrl || 'http://localhost:8010/v2/check';
  const timeout = options.timeout || 30000;
  const maxTextLength = options.maxTextLength || 60000;
  
  // Validate input
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }
  
  if (text.length === 0) {
    return normalizeResponse({ matches: [] });
  }
  
  // Truncate text if too long (LanguageTool has limits)
  const textToCheck = text.length > maxTextLength 
    ? text.substring(0, maxTextLength) 
    : text;
  
  // Parse API URL
  const parsedUrl = url.parse(apiUrl);
  const isHttps = parsedUrl.protocol === 'https:';
  const httpModule = isHttps ? https : http;
  
  // Prepare request data according to LanguageTool API spec
  const postData = JSON.stringify({
    text: textToCheck,
    language: language,
    enabledRules: options.enabledRules,
    disabledRules: options.disabledRules,
    enabledCategories: options.enabledCategories,
    disabledCategories: options.disabledCategories
  });
  
  const requestOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (isHttps ? 443 : 80),
    path: parsedUrl.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Accept': 'application/json'
    },
    timeout: timeout
  };
  
  return new Promise((resolve, reject) => {
    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Handle different HTTP status codes
          if (res.statusCode === 200) {
            const result = JSON.parse(data);
            resolve(normalizeResponse(result));
          } else if (res.statusCode === 400) {
            reject(new Error(`LanguageTool API: Bad request - ${data}`));
          } else if (res.statusCode === 413) {
            reject(new Error('LanguageTool API: Text too long (exceeds size limit)'));
          } else if (res.statusCode === 429) {
            reject(new Error('LanguageTool API: Rate limit exceeded'));
          } else if (res.statusCode >= 500) {
            reject(new Error(`LanguageTool API: Server error (${res.statusCode})`));
          } else {
            reject(new Error(`LanguageTool API error: ${res.statusCode} - ${data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse LanguageTool response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      // Handle connection errors
      if (error.code === 'ECONNREFUSED') {
        reject(new Error('LanguageTool API: Connection refused - is the server running?'));
      } else if (error.code === 'ENOTFOUND') {
        reject(new Error(`LanguageTool API: Host not found - ${parsedUrl.hostname}`));
      } else {
        reject(new Error(`LanguageTool API request failed: ${error.message}`));
      }
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`LanguageTool API request timeout after ${timeout}ms`));
    });
    
    // Send request
    req.write(postData);
    req.end();
  });
}

module.exports = {
  checkText,
  normalizeResponse
};
