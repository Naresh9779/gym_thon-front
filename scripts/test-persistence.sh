#!/bin/bash

# Test Progress Persistence After Page Refresh

echo "Testing Progress Persistence..."
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

# Log a workout
echo -e "\n2. Logging workout for today..."
TODAY=$(date +%Y-%m-%d)
WORKOUT_LOG=$(curl -s -X POST http://localhost:4000/api/progress/workout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$TODAY\",\"day\":\"Test Day\",\"completedExercises\":6,\"totalExercises\":10}")

WORKOUT_OK=$(echo $WORKOUT_LOG | jq -r '.ok')
if [ "$WORKOUT_OK" = "true" ]; then
  echo "✅ Workout logged successfully"
  echo "   - Date: $TODAY"
  echo "   - Completed: 6/10 exercises"
else
  echo "⚠️  Workout might already be logged"
fi

# Log multiple meals
echo -e "\n3. Logging meals for today..."

declare -a meals=("Breakfast" "Lunch" "Dinner")
for meal in "${meals[@]}"; do
  MEAL_LOG=$(curl -s -X POST http://localhost:4000/api/progress/meal \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"date\":\"$TODAY\",\"mealName\":\"$meal\",\"calories\":500,\"macros\":{\"p\":30,\"c\":50,\"f\":20}}")
  
  MEAL_OK=$(echo $MEAL_LOG | jq -r '.ok')
  if [ "$MEAL_OK" = "true" ]; then
    echo "   ✅ $meal logged"
  else
    ERROR_CODE=$(echo $MEAL_LOG | jq -r '.error.code')
    if [ "$ERROR_CODE" = "MEAL_ALREADY_LOGGED" ]; then
      echo "   ⚠️  $meal already logged"
    else
      echo "   ❌ Failed to log $meal"
    fi
  fi
done

# Verify data is persisted
echo -e "\n4. Verifying data persistence..."
STATS=$(curl -s -X GET "http://localhost:4000/api/progress/stats?days=1" \
  -H "Authorization: Bearer $TOKEN")

WORKOUTS=$(echo $STATS | jq -r '.data.workoutsCompleted')
MEALS=$(echo $STATS | jq -r '.data.totalMealsLogged')

echo "   📊 Current stats:"
echo "   - Workouts completed: $WORKOUTS"
echo "   - Meals logged: $MEALS"

# Check today's log specifically
echo -e "\n5. Fetching today's progress log..."
LOGS=$(curl -s -X GET "http://localhost:4000/api/progress?limit=1" \
  -H "Authorization: Bearer $TOKEN")

LOG_COUNT=$(echo $LOGS | jq -r '.data.items | length')
if [ "$LOG_COUNT" -gt 0 ]; then
  WORKOUT_COMPLETED=$(echo $LOGS | jq -r '.data.items[0].workout.completedExercises // 0')
  MEALS_COUNT=$(echo $LOGS | jq -r '.data.items[0].meals | length // 0')
  LOG_DATE=$(echo $LOGS | jq -r '.data.items[0].date')
  
  echo "   ✅ Found today's log:"
  echo "   - Date: $LOG_DATE"
  echo "   - Workout exercises completed: $WORKOUT_COMPLETED"
  echo "   - Meals logged: $MEALS_COUNT"
  
  if [ "$WORKOUT_COMPLETED" -gt 0 ] && [ "$MEALS_COUNT" -gt 0 ]; then
    echo -e "\n✅ SUCCESS: Data is persisted in database!"
    echo "   When you refresh the pages, this data will load automatically."
  else
    echo -e "\n⚠️  WARNING: Some data might be missing"
  fi
else
  echo "   ❌ No logs found"
fi

echo -e "\n6. Testing duplicate prevention..."
DUPLICATE=$(curl -s -X POST http://localhost:4000/api/progress/meal \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$TODAY\",\"mealName\":\"breakfast\",\"calories\":500}" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$DUPLICATE" | tail -1)
if [ "$HTTP_CODE" = "409" ]; then
  echo "   ✅ Duplicate prevention working (case-insensitive)"
else
  echo "   ⚠️  Unexpected status: $HTTP_CODE"
fi

echo -e "\n======================================="
echo "Persistence test complete!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3000/today-workout in browser"
echo "2. Refresh the page - workout should still show as logged"
echo "3. Open http://localhost:3000/today-meal in browser"
echo "4. Refresh the page - meals should still show as logged"
