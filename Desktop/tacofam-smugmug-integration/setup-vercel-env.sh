#!/bin/bash

# Setup Vercel Environment Variables
# This script adds environment variables from your .env file to Vercel
# Make sure you have the Vercel CLI installed: npm i -g vercel

echo "🚀 Setting up Vercel environment variables..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it with: npm i -g vercel"
    exit 1
fi

# Load environment variables from .env file
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Read variables from .env
source .env

# Set production URL (update this to your actual Vercel URL)
PRODUCTION_URL="https://your-app.vercel.app"

echo "Adding environment variables to Vercel..."
echo ""

# Add SMUGMUG_API_KEY
echo "✅ Adding SMUGMUG_API_KEY..."
vercel env add SMUGMUG_API_KEY production <<< "$SMUGMUG_API_KEY"
vercel env add SMUGMUG_API_KEY preview <<< "$SMUGMUG_API_KEY"

# Add SMUGMUG_API_SECRET
echo "✅ Adding SMUGMUG_API_SECRET..."
vercel env add SMUGMUG_API_SECRET production <<< "$SMUGMUG_API_SECRET"
vercel env add SMUGMUG_API_SECRET preview <<< "$SMUGMUG_API_SECRET"

# Add NEXT_PUBLIC_APP_URL for production
echo "✅ Adding NEXT_PUBLIC_APP_URL..."
vercel env add NEXT_PUBLIC_APP_URL production <<< "$PRODUCTION_URL"
vercel env add NEXT_PUBLIC_APP_URL preview <<< "$PRODUCTION_URL"

# Add ANTHROPIC_API_KEY
echo "✅ Adding ANTHROPIC_API_KEY..."
vercel env add ANTHROPIC_API_KEY production <<< "$ANTHROPIC_API_KEY"
vercel env add ANTHROPIC_API_KEY preview <<< "$ANTHROPIC_API_KEY"

echo ""
echo "🎉 Done! Environment variables added to Vercel."
echo ""
echo "⚠️  IMPORTANT: Update PRODUCTION_URL in this script to your actual Vercel URL"
echo "   Then run: vercel env rm NEXT_PUBLIC_APP_URL production"
echo "   And re-run this script to update the production URL"
