import { Schema } from 'mongoose';

/**
 * Shared Mongoose sub-schema for check-in data.
 * Single source of truth — imported by WorkoutPlan, DietPlan, PlanRequest.
 */
export const checkInSubSchema = new Schema(
  {
    currentWeight:  Number,
    energyLevel:    { type: Number, min: 1, max: 5 },
    sleepQuality:   { type: Number, min: 1, max: 5 },
    muscleSoreness: { type: Number, min: 1, max: 5 },
    dietAdherence:  { type: Number, min: 0, max: 100 },
    injuries:       String,
    notes:          String,
  },
  { _id: false },
);

export interface ICheckIn {
  currentWeight?: number;
  energyLevel?: number;
  sleepQuality?: number;
  muscleSoreness?: number;
  dietAdherence?: number;
  injuries?: string;
  notes?: string;
}

/**
 * Shared macro nutrients sub-schema (unified naming throughout the app).
 * Use { protein, carbs, fats } — NOT { p, c, f }.
 */
export const macroSubSchema = new Schema(
  { protein: Number, carbs: Number, fats: Number },
  { _id: false },
);

export interface IMacros {
  protein?: number;
  carbs?: number;
  fats?: number;
}
