#!/bin/bash

# Professional version update script for Amn Shield
# Usage: ./update-version.sh <new_version>

set -e

if [ $# -eq 0 ]; then
    echo "Error: Please provide a version number"
    echo "Usage: ./update-version.sh <version>"
    echo "Example: ./update-version.sh 1.1.0"
    exit 1
fi

NEW_VERSION=$1

# Validate version format (semantic versioning)
if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Invalid version format. Please use semantic versioning (e.g., 1.1.0)"
    exit 1
fi

echo "=========================================="
echo "Updating Amn Shield to version $NEW_VERSION"
echo "=========================================="

# Update manifest.json (Chrome/Edge)
echo "Updating manifest.json..."
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" manifest.json

# Update manifest-v2.json (Firefox)
echo "Updating manifest-v2.json..."
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" manifest-v2.json

# Update package.json
echo "Updating package.json..."
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" package.json

# Update build scripts with new version
echo "Updating build scripts..."
sed -i.bak "s/amn-shield-chrome-v[0-9]\+\.[0-9]\+\.[0-9]\+/amn-shield-chrome-v$NEW_VERSION/g" build-chrome.bat
sed -i.bak "s/amn-shield-firefox-v[0-9]\+\.[0-9]\+\.[0-9]\+/amn-shield-firefox-v$NEW_VERSION/g" build-firefox.bat

# Clean up backup files
rm -f *.bak

echo "? Version updated successfully!"
echo ""
echo "Updated files:"
echo "  - manifest.json"
echo "  - manifest-v2.json" 
echo "  - package.json"
echo "  - build-chrome.js"
echo "  - build-firefox.js"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Test the extension: npm run build"
echo "  3. Commit changes: git add . && git commit -m 'Version $NEW_VERSION'"
echo "  4. Create tag: git tag v$NEW_VERSION"
echo "  5. Build release: npm run build"
echo ""
echo "?? Ready for release v$NEW_VERSION!"