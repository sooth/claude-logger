#!/bin/bash

# Setup demo data for admin UI

echo "Setting up demo data for admin UI..."

# Generate a new key
echo "1" | claude-analytics login

# Sync current data
claude-analytics sync

echo -e "\n✅ Demo data synced!"
echo "🌐 Visit http://localhost:8276/admin to see the data"
echo "🔑 Admin Key: 59250f94e1ffe330d63ed80d9d749fdb"