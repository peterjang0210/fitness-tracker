import type { LibraryExercise } from "../storage/appData.ts";

export const builtinExercises: LibraryExercise[] = [
  { id: "flat-bench", name: "Bench press", muscleGroup: "Chest", category: "compound", equipment: "Barbell", instructions: "Touch the chest and press to lockout.", defaultSets: 3, defaultReps: "5" },
  { id: "paused-bench", name: "Paused bench press", muscleGroup: "Chest", category: "compound", equipment: "Barbell", instructions: "Pause on the chest, stay tight, then press.", defaultSets: 3, defaultReps: "6" },
  { id: "incline-db-press", name: "Incline dumbbell press", muscleGroup: "Chest", category: "compound", equipment: "Dumbbell", instructions: "", defaultSets: 2, defaultReps: "8–10" },
  { id: "bodyweight-dips", name: "Dips", muscleGroup: "Chest", category: "compound", equipment: "Bodyweight", instructions: "Lean slightly forward. Stop if the shoulder pinches.", defaultSets: 3, defaultReps: "6–10" },
  { id: "cable-fly", name: "Cable flies", muscleGroup: "Chest", category: "isolation", equipment: "Cable", instructions: "", defaultSets: 2, defaultReps: "12–15" },
  { id: "lat-pulldown", name: "Lat pulldowns", muscleGroup: "Back", category: "compound", equipment: "Cable", instructions: "", defaultSets: 2, defaultReps: "10–12" },
  { id: "cable-row", name: "Cable rows", muscleGroup: "Back", category: "compound", equipment: "Cable", instructions: "", defaultSets: 3, defaultReps: "8–12" },
  { id: "archer-pull", name: "Archer pulls", muscleGroup: "Back", category: "compound", equipment: "Bodyweight", instructions: "Pull toward one shoulder, then switch arms.", defaultSets: 3, defaultReps: "8–12" },
  { id: "cable-pullover", name: "Pullovers", muscleGroup: "Back", category: "isolation", equipment: "Cable", instructions: "", defaultSets: 2, defaultReps: "10–12" },
  { id: "cable-lateral-raise", name: "Cable lateral raises", muscleGroup: "Shoulders", category: "isolation", equipment: "Cable", instructions: "", defaultSets: 2, defaultReps: "12–15" },
  { id: "cable-biceps-curl", name: "Cable bicep curls", muscleGroup: "Biceps", category: "isolation", equipment: "Cable", instructions: "", defaultSets: 2, defaultReps: "10–15" },
  { id: "triceps-pushdown", name: "Triceps pushdowns", muscleGroup: "Triceps", category: "isolation", equipment: "Cable", instructions: "", defaultSets: 2, defaultReps: "10–15" },
  { id: "barbell-squat", name: "Squats", muscleGroup: "Quads", category: "compound", equipment: "Barbell", instructions: "Brace, reach depth, and stand tall.", defaultSets: 3, defaultReps: "5" },
  { id: "light-squat", name: "Light squat", muscleGroup: "Quads", category: "compound", equipment: "Barbell", instructions: "Keep this easier than the main squat day.", defaultSets: 3, defaultReps: "5" },
  { id: "squat-backoff", name: "Squat back-off", muscleGroup: "Quads", category: "compound", equipment: "Barbell", instructions: "Optional extra set after the main squat work.", defaultSets: 1, defaultReps: "5" },
  { id: "leg-press", name: "Leg press", muscleGroup: "Quads", category: "compound", equipment: "Machine", instructions: "", defaultSets: 2, defaultReps: "10–12" },
  { id: "leg-curl", name: "Leg curls", muscleGroup: "Hamstrings", category: "isolation", equipment: "Machine", instructions: "", defaultSets: 2, defaultReps: "10–12" },
  { id: "leg-extension", name: "Leg extensions", muscleGroup: "Quads", category: "isolation", equipment: "Machine", instructions: "", defaultSets: 2, defaultReps: "12–15" },
  { id: "calf-raise", name: "Calf raises", muscleGroup: "Calves", category: "isolation", equipment: "Machine", instructions: "", defaultSets: 2, defaultReps: "12–15" },
  { id: "pulldown-or-archer", name: "Lat pulldown or archer pulls", muscleGroup: "Back", category: "compound", equipment: "Cable", instructions: "Use whichever variation is available.", defaultSets: 3, defaultReps: "8–12" },
];

const builtinIds = new Set(builtinExercises.map((item) => item.id));

export function isBuiltinExercise(id: string): boolean {
  return builtinIds.has(id);
}

export function mergedLibrary(stored: LibraryExercise[]): LibraryExercise[] {
  const overrides = new Map(stored.map((item) => [item.id, item]));
  const builtins = builtinExercises.map((item) => ({ ...item, ...overrides.get(item.id), id: item.id }));
  const custom = stored.filter((item) => !builtinIds.has(item.id));
  return [...builtins, ...custom].sort((a, b) => a.name.localeCompare(b.name) || a.muscleGroup.localeCompare(b.muscleGroup));
}
