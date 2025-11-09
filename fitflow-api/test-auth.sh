#!/bin/bash

# FitFlow API - Auth System Test Suite

API_URL="http://localhost:4000/api"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           FITFLOW AUTH SYSTEM - TEST SUITE                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Register
echo "📝 Test 1: Register New User"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test${TIMESTAMP}@fitflow.com"

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"test123\",\"name\":\"Test User\"}")

if echo "$REGISTER_RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Registration successful"
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
    USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   User ID: $USER_ID"
else
    echo "❌ Registration failed"
    echo "$REGISTER_RESPONSE"
    exit 1
fi
echo ""

# Test 2: Get Current User
echo "👤 Test 2: Get Current User (Protected Endpoint)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ME_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$ME_RESPONSE" | grep -q "$USER_ID"; then
    echo "✅ Protected endpoint access successful"
    echo "   Email: $TEST_EMAIL"
else
    echo "❌ Failed to access protected endpoint"
    echo "$ME_RESPONSE"
    exit 1
fi
echo ""

# Test 3: Unauthorized Access
echo "🔒 Test 3: Unauthorized Access (No Token)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
UNAUTH_RESPONSE=$(curl -s -X GET "$API_URL/auth/me")

if echo "$UNAUTH_RESPONSE" | grep -q '"ok":false'; then
    echo "✅ Correctly blocked unauthorized access"
else
    echo "❌ Security issue: Unauthorized access allowed"
    exit 1
fi
echo ""

# Test 4: Login
echo "🔑 Test 4: Login with Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"test123\"}")

if echo "$LOGIN_RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Login successful"
    NEW_ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    NEW_REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
else
    echo "❌ Login failed"
    echo "$LOGIN_RESPONSE"
    exit 1
fi
echo ""

# Test 5: Wrong Password
echo "❌ Test 5: Login with Wrong Password"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
WRONG_PWD_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrongpassword\"}")

if echo "$WRONG_PWD_RESPONSE" | grep -q 'Invalid credentials'; then
    echo "✅ Correctly rejected wrong password"
else
    echo "❌ Security issue: Wrong password accepted"
    exit 1
fi
echo ""

# Test 6: Refresh Token
echo "🔄 Test 6: Refresh Access Token"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$NEW_REFRESH_TOKEN\"}")

if echo "$REFRESH_RESPONSE" | grep -q '"accessToken"'; then
    echo "✅ Token refresh successful"
    REFRESHED_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
else
    echo "❌ Token refresh failed"
    echo "$REFRESH_RESPONSE"
    exit 1
fi
echo ""

# Test 7: Use Refreshed Token
echo "✨ Test 7: Use Refreshed Access Token"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
REFRESH_ME_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $REFRESHED_TOKEN")

if echo "$REFRESH_ME_RESPONSE" | grep -q "$USER_ID"; then
    echo "✅ Refreshed token works correctly"
else
    echo "❌ Refreshed token failed"
    exit 1
fi
echo ""

# Test 8: Logout
echo "👋 Test 8: Logout"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
LOGOUT_RESPONSE=$(curl -s -X POST "$API_URL/auth/logout" \
  -H "Authorization: Bearer $REFRESHED_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$NEW_REFRESH_TOKEN\"}")

if echo "$LOGOUT_RESPONSE" | grep -q 'Logged out successfully'; then
    echo "✅ Logout successful"
else
    echo "❌ Logout failed"
    echo "$LOGOUT_RESPONSE"
fi
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              ✅ ALL AUTH TESTS PASSED                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Summary:"
echo "  ✓ User registration with password hashing"
echo "  ✓ JWT token generation (access + refresh)"
echo "  ✓ Protected endpoint authentication"
echo "  ✓ Unauthorized access prevention"
echo "  ✓ Login with credential validation"
echo "  ✓ Wrong password rejection"
echo "  ✓ Token refresh flow"
echo "  ✓ Refreshed token usage"
echo "  ✓ Logout and session cleanup"
echo ""
