# Cross-Browser Installation and Testing Guide

## Amn Shield Extension - Cross-Browser Support

### Browser Compatibility

? **Chrome** (v88+) - Manifest V3  
? **Microsoft Edge** (v88+) - Manifest V3  
? **Firefox** (v109+) - Manifest V2  
? **Safari** (v14+) - WebExtensions API  
? **Opera** - Chromium-based  
? **Brave** - Chromium-based  
? **Vivaldi** - Chromium-based  

## Installation Instructions

### Chrome / Edge / Brave / Opera / Vivaldi
1. Navigate to `chrome://extensions/` (or equivalent)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `build/chrome/` folder

### Firefox
1. Navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `manifest.json` from `build/firefox/` folder

### Safari (macOS)
1. For Safari 14+: Use `build/chrome/` folder (WebExtensions support)
2. For older Safari: Convert using Xcode Safari App Extension

## Testing Checklist

### Basic Functionality
- [ ] Extension loads without errors
- [ ] Popup interface opens correctly
- [ ] Toggle switches work (Haram content & Social Media)
- [ ] Custom keywords can be added/removed
- [ ] Password protection functions

### Content Blocking
- [ ] Haram keywords are blocked
- [ ] Social media sites are blocked when enabled
- [ ] Custom keywords block correctly
- [ ] Blocking rules update when settings change

### Cross-Browser Features
- [ ] Storage synchronization works
- [ ] Settings persist after browser restart
- [ ] No console errors in developer tools
- [ ] All API calls are compatible

## Build Process

### Automated Builds
```bash
# Windows
build-all.bat

# Linux/macOS  
chmod +x build.sh
./build.sh
```

### Manual Testing
1. Load extension in target browser
2. Test all features
3. Check console for errors
4. Verify blocking functionality

## API Compatibility Notes

### Manifest V3 (Chrome/Edge)
- Uses `declarativeNetRequest` for efficient blocking
- Service worker background script
- `action` API for popup

### Manifest V2 (Firefox)
- Uses `webRequest` API for blocking
- Background page with scripts
- `browser_action` API for popup

### Safari
- Falls back to content scripts for blocking
- Uses localStorage for settings in older versions
- WebExtensions API in Safari 14+

## Troubleshooting

### Common Issues
1. **Permissions Error**: Ensure all required permissions are granted
2. **Blocking Not Working**: Check if browser supports the blocking API
3. **Settings Not Saving**: Verify storage permissions
4. **Popup Not Opening**: Check manifest file validity

### Debug Mode
Enable debug logging by opening browser developer tools and checking console output.

## Distribution

### Chrome Web Store
- Use `build/chrome/` folder
- Package as .zip file
- Submit for review

### Firefox Add-ons (AMO)
- Use `build/firefox/` folder  
- Package as .xpi file
- Submit for review

### Edge Add-ons Store
- Use `build/chrome/` folder
- Package as .zip file
- Submit for review

## Development

### File Structure
```
??? manifest.json (Chrome/Edge - V3)
??? manifest-v2.json (Firefox - V2)
??? background.js (V3 service worker)
??? background-v2.js (V2 background script)
??? popup.html (UI)
??? popup.js (UI logic)
??? polyfill.js (Cross-browser compatibility)
??? safari-content.js (Safari content script)
??? images/ (Extension icons)
```

### Key Differences Between Browsers
- **API Names**: `chrome.*` vs `browser.*`
- **Manifest Versions**: V2 vs V3
- **Background Scripts**: Service Worker vs Background Page
- **Blocking APIs**: declarativeNetRequest vs webRequest
- **Storage**: Different sync implementations