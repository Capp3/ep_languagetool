/**
 * ep_languagetool - LanguageTool integration for Etherpad
 * Server-side entry point
 */

const settings = require('ep_etherpad-lite/node/utils/Settings');
const http = require('http');
const https = require('https');
const url = require('url');

// Default configuration
const defaultConfig = {
  apiUrl: 'http://localhost:8010/v2/check',
  defaultLanguage: 'en',
  autoCheck: true,
  debounceDelay: 2000
};

// Get plugin configuration from Etherpad settings
let pluginConfig = {};

/**
 * Load settings hook - called when Etherpad loads settings
 */
exports.loadSettings = (hookName, context, callback) => {
  const epLanguagetoolSettings = settings.ep_languagetool || {};
  
  // Merge with defaults
  pluginConfig = {
    ...defaultConfig,
    ...epLanguagetoolSettings
  };
  
  console.log('[ep_languagetool] Configuration loaded:', pluginConfig);
  callback();
};

/**
 * Client vars hook - pass configuration to client-side
 */
exports.clientVars = (hookName, context, callback) => {
  callback({
    ep_languagetool: {
      apiUrl: pluginConfig.apiUrl,
      defaultLanguage: pluginConfig.defaultLanguage,
      autoCheck: pluginConfig.autoCheck,
      debounceDelay: pluginConfig.debounceDelay
    }
  });
};

/**
 * Hook to inject CSS into editor
 */
exports.eejsBlock_editorCss = (hookName, args, callback) => {
  args.content = args.content + '<link rel="stylesheet" href="../static/plugins/ep_languagetool/static/css/languagetool.css">';
  callback();
};

/**
 * Express create server hook - set up API endpoint for LanguageTool requests
 */
exports.expressCreateServer = (hookName, args, callback) => {
  const app = args.app;
  
  // Endpoint to handle LanguageTool check requests from client
  app.post('/ep_languagetool/check', async (req, res) => {
    try {
      const { text, language, padId } = req.body;
      
      // Validate input
      if (!text && !padId) {
        return res.status(400).json({ 
          error: 'Either text or padId is required',
          code: 'MISSING_INPUT'
        });
      }
      
      let textToCheck = text;
      
      // If padId provided, extract text from pad
      if (padId && !text) {
        try {
          const padManager = require('ep_etherpad-lite/node/db/PadManager');
          const pad = await padManager.getPad(padId);
          if (pad) {
            textToCheck = pad.text();
          } else {
            return res.status(404).json({ 
              error: 'Pad not found',
              code: 'PAD_NOT_FOUND'
            });
          }
        } catch (padError) {
          console.error('[ep_languagetool] Error getting pad text:', padError);
          return res.status(500).json({ 
            error: 'Failed to get pad text',
            code: 'PAD_ERROR',
            message: padError.message 
          });
        }
      }
      
      // Validate text
      if (!textToCheck || typeof textToCheck !== 'string') {
        return res.status(400).json({ 
          error: 'Invalid text provided',
          code: 'INVALID_TEXT'
        });
      }
      
      if (textToCheck.length === 0) {
        return res.json({ matches: [] });
      }
      
      // Use language from request or fallback to default
      const lang = language || pluginConfig.defaultLanguage || 'en';
      
      // Call LanguageTool API
      const languagetoolClient = require('./lib/languagetool-client');
      const result = await languagetoolClient.checkText(
        textToCheck,
        lang,
        { 
          apiUrl: pluginConfig.apiUrl,
          timeout: pluginConfig.timeout || 30000
        }
      );
      
      // Log successful check (without sensitive data)
      console.log(`[ep_languagetool] Checked ${textToCheck.length} characters, found ${result.matches.length} matches`);
      
      res.json(result);
    } catch (error) {
      console.error('[ep_languagetool] Error checking text:', error);
      
      // Determine appropriate status code based on error
      let statusCode = 500;
      let errorCode = 'UNKNOWN_ERROR';
      
      if (error.message.includes('timeout')) {
        statusCode = 504;
        errorCode = 'TIMEOUT';
      } else if (error.message.includes('Connection refused') || error.message.includes('Host not found')) {
        statusCode = 503;
        errorCode = 'SERVICE_UNAVAILABLE';
      } else if (error.message.includes('Rate limit')) {
        statusCode = 429;
        errorCode = 'RATE_LIMIT';
      } else if (error.message.includes('Bad request')) {
        statusCode = 400;
        errorCode = 'BAD_REQUEST';
      }
      
      res.status(statusCode).json({ 
        error: 'Failed to check text',
        code: errorCode,
        message: error.message 
      });
    }
  });
  
  callback();
};

/**
 * Pad init toolbar hook - add "Check Grammar" button to toolbar
 */
exports.padInitToolbar = (hookName, context, callback) => {
  const toolbar = context.toolbar;
  
  // Add button to toolbar using Etherpad's button API
  // Use a more appropriate icon class or create custom icon
  const checkGrammarButton = toolbar.button({
    command: 'checkGrammar',
    localizationId: 'ep_languagetool.checkGrammar',
    class: 'buttonicon buttonicon-edit ep-languagetool-button',
    title: 'Check Grammar'
  });
  
  callback();
};
