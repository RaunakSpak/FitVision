/** Readable labels for tracked form mistakes */
export const MISTAKE_LABELS: Record<string, string> = {
  none: "No issues",
  poor_alignment: "Poor alignment",
  hips_too_high: "Hips too high",
  hips_too_low: "Hips too low",
  elbow_not_low_enough: "Not deep enough",
  body_not_straight: "Body not straight",
  not_deep_enough: "Not deep enough",
  knees_collapse: "Knees collapsing inward",
  torso_lean: "Torso leaning too much",
  heels_lifted: "Heels lifted",
  shallow_movement: "Shallow movement",
  not_standing_full: "Not standing fully",
  shoulders_not_aligned: "Shoulders not aligned",
  incomplete_curl: "Incomplete curl",
  incomplete_rep: "Incomplete rep",
  elbow_unstable: "Elbow unstable",
  not_fully_extended: "Arm not fully extended",
  wrist_unstable: "Wrist unstable",
  low_visibility: "Poor tracking visibility",
};

export function getMistakeLabel(id: string): string {
  return MISTAKE_LABELS[id] ?? id.replace(/_/g, " ");
}

export function getTopMistakes(
  counts: Record<string, number>,
  limit = 5
): { id: string; label: string; count: number }[] {
  return Object.entries(counts)
    .filter(([id]) => id !== "none")
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ id, label: getMistakeLabel(id), count }));
}
