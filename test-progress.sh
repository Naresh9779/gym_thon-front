#!/bin/bash

# Test Progress Tracking Integration

echo "Testing Progress Tracking Endpoints..."
echo "======================================="

# Get admin token
echo -e "\n1. Login as admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fitflow.com","password":"ChangeMe123!"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  exit 1
fi

echo "✅ Login successful"

# Test workout logging
echo -e "\n2. Testing workout logging..."
WORKOUT_LOG=$(curl -s -X POST http://localhost:4000/api/progress/workout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$(date +%Y-%m-%d)\",\"day\":\"Monday\",\"completedExercises\":5,\"totalExercises\":8}")

WORKOUT_OK=$(echo $WORKOUT_LOG | jq -r '.ok')
if [ "$WORKOUT_OK" = "true" ]; then
  echo "✅ Workout logged successfully"
else
  echo "❌ Failed to log workout"
  echo $WORKOUT_LOG | jq
fi

# Test meal logging
echo -e "\n3. Testing meal logging..."
MEAL_LOG=$(curl -s -X POST http://localhost:4000/api/progress/meal \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$(date +%Y-%m-%d)\",\"mealName\":\"Breakfast\",\"calories\":450,\"macros\":{\"p\":30,\"c\":50,\"f\":15}}")

MEAL_OK=$(echo $MEAL_LOG | jq -r '.ok')
if [ "$MEAL_OK" = "true" ]; then
  echo "✅ Meal logged successfully"
elif [ "$(echo $MEAL_LOG | jq -r '.error.code')" = "MEAL_ALREADY_LOGGED" ]; then
  echo "⚠️  Meal already logged today (expected if running multiple times)"
else
  echo "❌ Failed to log meal"
  echo $MEAL_LOG | jq
fi

# Test duplicate meal prevention
echo -e "\n4. Testing duplicate meal prevention..."
DUPLICATE_MEAL=$(curl -s -X POST http://localhost:4000/api/progress/meal \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$(date +%Y-%m-%d)\",\"mealName\":\"Breakfast\",\"calories\":450}")

DUPLICATE_STATUS=$(curl -s -X POST http://localhost:4000/api/progress/meal \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "%{http_code}" \
  -d "{\"date\":\"$(date +%Y-%m-%d)\",\"mealName\":\"Breakfast\",\"calories\":450}" \
  -o /dev/null)

if [ "$DUPLICATE_STATUS" = "409" ]; then
  echo "✅ Duplicate prevention working"
else
  echo "⚠️  Unexpected status: $DUPLICATE_STATUS"
fi

# Test stats endpoint
echo -e "\n5. Testing progress stats..."
STATS=$(curl -s -X GET "http://localhost:4000/api/progress/stats?days=30" \
  -H "Authorization: Bearer $TOKEN")

STATS_OK=$(echo $STATS | jq -r '.ok')
if [ "$STATS_OK" = "true" ]; then
  WORKOUTS=$(echo $STATS | jq -r '.data.workoutsCompleted')
  MEALS=$(echo $STATS | jq -r '.data.totalMealsLogged')
  ACTIVE=$(echo $STATS | jq -r '.data.activeDays')
  STREAK=$(echo $STATS | jq -r '.data.currentStreak')
  echo "✅ Stats retrieved successfully"
  echo "   - Workouts: $WORKOUTS"
  echo "   - Meals: $MEALS"
  echo "   - Active Days: $ACTIVE"
  echo "   - Current Streak: $STREAK"
else
  echo "❌ Failed to get stats"
  echo $STATS | jq
fi

# Test trends endpoint
echo -e "\n6. Testing progress trends..."
TRENDS=$(curl -s -X GET "http://localhost:4000/api/progress/trends?days=7" \
  -H "Authorization: Bearer $TOKEN")

TRENDS_OK=$(echo $TRENDS | jq -r '.ok')
if [ "$TRENDS_OK" = "true" ]; then
  SERIES_COUNT=$(echo $TRENDS | jq -r '.data.series | length')
  echo "✅ Trends retrieved successfully"
  echo "   - Days of data: $SERIES_COUNT"
else
  echo "❌ Failed to get trends"
  echo $TRENDS | jq
fi

echo -e "\n======================================="
echo "Progress tracking test complete!"
