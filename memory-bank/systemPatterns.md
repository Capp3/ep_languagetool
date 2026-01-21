# System Patterns

## Plugin Architecture Pattern

### Standard Etherpad Plugin Structure
```
ep_languagetool/
├── ep.json              # Hook registrations
├── package.json         # Dependencies
├── index.js            # Server-side main
├── static/
│   ├── js/
│   │   └── languagetool.js  # Client-side logic
│   └── css/
│       └── languagetool.css  # Styling
├── templates/
│   └── toolbar.ejs     # UI templates
└── locales/
    └── en.json         # Translations
```

### Hook Registration Pattern
```json
{
  "parts": [
    {
      "name": "main",
      "hooks": {
        "expressCreateServer": "ep_languagetool/index:expressCreateServer",
        "loadSettings": "ep_languagetool/index:loadSettings",
        "clientVars": "ep_languagetool/index:clientVars"
      },
      "client_hooks": {
        "postAceInit": "ep_languagetool/static/js/languagetool:postAceInit",
        "acePopulateDOMLine": "ep_languagetool/static/js/languagetool:acePopulateDOMLine"
      }
    }
  ]
}
```

### Server-Side Pattern
```javascript
exports.expressCreateServer = (hookName, args, cb) => {
  // Mount routes, setup middleware
  cb();
};

exports.clientVars = (hookName, context, cb) => {
  // Pass config to client
  cb({ languagetool: { enabled: true } });
};
```

### Client-Side Pattern
```javascript
exports.postAceInit = (hookName, args, cb) => {
  // Initialize after editor loads
  // Set up event listeners
  cb();
};
```

## LanguageTool Integration Pattern

### API Client Pattern
```javascript
async function checkText(text, language, options) {
  const response = await fetch(LT_API_URL, {
    method: 'POST',
    body: JSON.stringify({ text, language, ...options })
  });
  return response.json();
}
```

### Error Highlighting Pattern
- Use `aceAttribsClasses` to add CSS classes
- Use `acePopulateDOMLine` to modify DOM
- CSS classes trigger visual indicators (underlines, highlights)

### Debouncing Pattern
```javascript
let checkTimeout;
function debouncedCheck(text) {
  clearTimeout(checkTimeout);
  checkTimeout = setTimeout(() => {
    performCheck(text);
  }, 2000); // 2 second delay
}
```

## Configuration Pattern
- Server-side: `settings.json` for global config
- Client-side: `clientVars` hook to pass config
- Per-pad: Store in pad attributes or plugin-specific storage
