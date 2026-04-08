#!/bin/bash
echo "Pulizia cache Next.js..."
rm -rf .next

echo "Pulizia cache node_modules..."
rm -rf node_modules/.cache

echo "Avvio dev server..."
npm run dev
