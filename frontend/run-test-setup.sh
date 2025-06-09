#!/bin/bash

echo "🚀 Setting up test document for search functionality..."
echo "Organization ID: f32625fb-d44f-4fdb-be0d-910539614ad2"
echo ""

# Run the database insertion script
echo "📁 Inserting test document into database..."
cd frontend
node insert-test-document.js

echo ""
echo "🧪 Test Setup Complete!"
echo ""
echo "You can now test the search functionality with these curl commands:"
echo ""
echo "1. 📋 Get organization files:"
echo "curl -X GET 'http://localhost:3000/api/files?organizationId=f32625fb-d44f-4fdb-be0d-910539614ad2'"
echo ""
echo "2. 🔍 Search for 'test':"
echo "curl -X GET 'http://localhost:3000/api/search?q=test&organizationId=f32625fb-d44f-4fdb-be0d-910539614ad2&highlight=true'"
echo ""
echo "3. 🔍 Search for 'FTS5':"
echo "curl -X GET 'http://localhost:3000/api/search?q=FTS5&organizationId=f32625fb-d44f-4fdb-be0d-910539614ad2&highlight=true'"
echo ""
echo "4. 🔍 Search for 'database':"
echo "curl -X GET 'http://localhost:3000/api/search?q=database&organizationId=f32625fb-d44f-4fdb-be0d-910539614ad2&highlight=true'"
echo ""
echo "5. 💡 Get search suggestions:"
echo "curl -X GET 'http://localhost:3000/api/search/suggest?q=test&organizationId=f32625fb-d44f-4fdb-be0d-910539614ad2'"
echo ""
echo "🌐 Dashboard URL:"
echo "http://localhost:3000/f32625fb-d44f-4fdb-be0d-910539614ad2/dashboard"
echo ""
echo "📝 Note: Make sure your Next.js development server is running first!"
echo "Run: npm run dev"
