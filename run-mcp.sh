#!/bin/bash
# WSL MCP Server runner script

# Ensure we have the right Node.js environment
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Echo a message for logging
echo "Starting MCP server with Redis at redis://0.0.0.0:1313"

# Run the MCP server
exec npx @upstash/context7-mcp redis://0.0.0.0:1313
