#!/bin/bash

# Script to clean Python cache files and remove them from git tracking

echo "🧹 Cleaning Python cache files..."

# Remove all __pycache__ directories and .pyc files
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.pyo" -delete 2>/dev/null || true
find . -name "*.pyd" -delete 2>/dev/null || true
find . -name ".cache" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove from git tracking if they exist
git rm -r --cached **/__pycache__/ 2>/dev/null || true
git rm -r --cached __pycache__/ 2>/dev/null || true
git rm --cached **/*.pyc 2>/dev/null || true
git rm --cached *.pyc 2>/dev/null || true

echo "✅ Python cache files cleaned!"
echo ""
echo "📝 Next steps:"
echo "1. Run: chmod +x clean_pycache.sh"
echo "2. Run: ./clean_pycache.sh"
echo "3. Commit the changes: git add . && git commit -m 'Clean Python cache files and update .gitignore'"
echo ""
echo "🔍 The updated .gitignore now includes comprehensive patterns:"
echo "   - __pycache__/"
echo "   - */__pycache__/"
echo "   - **/__pycache__/"
echo "   - *.py[cod]"
echo "   - And many more Python-specific patterns"
