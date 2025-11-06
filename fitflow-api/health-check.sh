#!/bin/bash

# FitFlow API Health Check Script

API_URL="http://localhost:4000"

echo "🏥 FitFlow API Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if server is running
if curl -s "$API_URL/api/health" > /dev/null; then
    echo "✅ Server is running on $API_URL"
    
    # Test critical endpoints
    echo ""
    echo "Testing endpoints..."
    
    # Health
    if curl -s "$API_URL/api/health" | grep -q '"ok":true'; then
        echo "  ✅ /api/health"
    else
        echo "  ❌ /api/health"
    fi
    
    # Auth
    if curl -s "$API_URL/api/auth/me" | grep -q '"ok":true'; then
        echo "  ✅ /api/auth/me"
    else
        echo "  ❌ /api/auth/me"
    fi
    
    # Diet
    if curl -s "$API_URL/api/diet" | grep -q '"ok":true'; then
        echo "  ✅ /api/diet"
    else
        echo "  ❌ /api/diet"
    fi
    
    # Workouts
    if curl -s "$API_URL/api/workouts" | grep -q '"ok":true'; then
        echo "  ✅ /api/workouts"
    else
        echo "  ❌ /api/workouts"
    fi
    
    # Progress
    if curl -s "$API_URL/api/progress" | grep -q '"ok":true'; then
        echo "  ✅ /api/progress"
    else
        echo "  ❌ /api/progress"
    fi
    
    # Reports
    if curl -s "$API_URL/api/reports/diet/monthly/2025/11" | grep -q '"ok":true'; then
        echo "  ✅ /api/reports"
    else
        echo "  ❌ /api/reports"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ All systems operational!"
    
else
    echo "❌ Server is not running on $API_URL"
    echo ""
    echo "To start the server:"
    echo "  cd fitflow-api"
    echo "  npm run dev"
    exit 1
fi
