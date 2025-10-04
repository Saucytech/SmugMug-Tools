#!/bin/bash

echo "🌮 TacoFam SmugMug Integration - Setup Script"
echo "=============================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js 18+ from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  No .env.local file found!"
    echo "Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo ""
    echo "📝 Please edit .env.local and add your SmugMug API credentials:"
    echo "   1. Get API Key from: https://api.smugmug.com/api/developer/apply"
    echo "   2. Open .env.local"
    echo "   3. Replace 'your_api_key_here' with your actual API key"
    echo "   4. Replace 'your_api_secret_here' with your actual API secret"
    echo ""
    echo "After updating .env.local, run this script again!"
    exit 0
else
    echo "✅ .env.local found"
fi

# Check if API keys are set
source .env.local
if [ "$SMUGMUG_API_KEY" = "your_api_key_here" ] || [ -z "$SMUGMUG_API_KEY" ]; then
    echo "❌ SmugMug API Key not configured!"
    echo "Please edit .env.local and add your API credentials"
    exit 1
fi

if [ "$SMUGMUG_API_SECRET" = "your_api_secret_here" ] || [ -z "$SMUGMUG_API_SECRET" ]; then
    echo "❌ SmugMug API Secret not configured!"
    echo "Please edit .env.local and add your API credentials"
    exit 1
fi

echo "✅ API credentials configured"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
else
    echo "✅ Dependencies already installed"
    echo ""
fi

echo "🚀 Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"
echo ""
echo "Then open your browser to: http://localhost:3000"
echo ""
echo "📖 For detailed instructions, see SETUP-GUIDE.md"
