#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="http://localhost:4000/api"
TEST_EMAIL="workouttest@example.com"
TEST_PASSWORD="testpass123"
ACCESS_TOKEN=""

echo "======================================"
echo "FitFlow - Workout Generation Test Suite"
echo "======================================"
echo ""

# Register or login
echo -e "${YELLOW}Auth: Register/Login${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Workout Test User\"}")

if echo "$REGISTER_RESPONSE" | grep -q '"ok":true'; then
  ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
  LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
  if echo "$LOGIN_RESPONSE" | grep -q '"ok":true'; then
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  else
    echo -e "${RED}✗ Auth failed${NC}"; echo "$LOGIN_RESPONSE"; exit 1
  fi
fi

echo -e "${YELLOW}Profile: Ensure profile data${NC}"
PROFILE_UPDATE=$(curl -s -X PATCH "$API_URL/users/profile" -H "Content-Type: application/json" -H "Authorization: Bearer $ACCESS_TOKEN" -d '{
  "age": 27,
  "weight": 70,
  "height": 172,
  "gender": "male",
  "activityLevel": "moderate",
  "goals": "muscle_gain"
}')
if echo "$PROFILE_UPDATE" | grep -q '"ok":true'; then echo -e "${GREEN}✓ Profile updated${NC}"; else echo -e "${YELLOW}⚠ Profile update may have failed${NC}"; fi

START_DATE=$(date +%Y-%m-%d)

echo -e "${YELLOW}Generate: Workout Cycle${NC}"
GEN_RESPONSE=$(curl -s -X POST "$API_URL/workouts/generate-cycle" -H "Content-Type: application/json" -H "Authorization: Bearer $ACCESS_TOKEN" -d "{\"startDate\":\"$START_DATE\",\"durationWeeks\":4}")

if echo "$GEN_RESPONSE" | grep -q '"ok":true'; then
  PLAN_ID=$(python3 -c "import sys,json; print(json.load(sys.stdin)['data']['workoutPlan']['_id'])" <<< "$GEN_RESPONSE" 2>/dev/null)
  echo -e "${GREEN}✓ Workout cycle generated${NC}"; echo "  Plan ID: $PLAN_ID"
else
  if echo "$GEN_RESPONSE" | grep -q 'overlaps'; then
    echo -e "${YELLOW}⚠ Overlap detected, using existing plan${NC}"
    EXISTING_ID=$(python3 -c "import sys,json; print(json.load(sys.stdin)['error'].get('existingPlanId',''))" <<< "$GEN_RESPONSE" 2>/dev/null)
    PLAN_ID=$EXISTING_ID
  else
    echo -e "${RED}✗ Generation failed${NC}"; echo "$GEN_RESPONSE"; exit 1
  fi
fi

if [ -z "$PLAN_ID" ]; then echo -e "${RED}✗ Missing plan id${NC}"; exit 1; fi

echo -e "${YELLOW}Fetch: All Workout Plans${NC}"
GET_ALL=$(curl -s -X GET "$API_URL/workouts" -H "Authorization: Bearer $ACCESS_TOKEN")
if echo "$GET_ALL" | grep -q '"ok":true'; then echo -e "${GREEN}✓ Plans fetched${NC}"; else echo -e "${RED}✗ Fetch failed${NC}"; echo "$GET_ALL"; fi

echo -e "${YELLOW}Fetch: Workout Plan by ID${NC}"
GET_ONE=$(curl -s -X GET "$API_URL/workouts/$PLAN_ID" -H "Authorization: Bearer $ACCESS_TOKEN")
if echo "$GET_ONE" | grep -q '"ok":true'; then echo -e "${GREEN}✓ Plan fetched by ID${NC}"; else echo -e "${RED}✗ Fetch by ID failed${NC}"; echo "$GET_ONE"; fi

echo -e "${YELLOW}Delete: Workout Plan${NC}"
DEL=$(curl -s -X DELETE "$API_URL/workouts/$PLAN_ID" -H "Authorization: Bearer $ACCESS_TOKEN")
if echo "$DEL" | grep -q '"ok":true'; then echo -e "${GREEN}✓ Plan deleted${NC}"; else echo -e "${RED}✗ Delete failed${NC}"; echo "$DEL"; fi

echo ""
echo "======================================"
echo -e "${GREEN}Workout Generation Test Suite Complete!${NC}"
echo "======================================"
