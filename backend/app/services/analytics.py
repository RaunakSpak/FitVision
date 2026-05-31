from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from app.models.workout import WorkoutSession

EXERCISE_LABELS: dict[str, str] = {
    "pushup": "Push-up",
    "squat": "Squat",
    "plank": "Plank",
    "bicep_curl": "Bicep Curl",
    "lunge": "Lunge",
    "shoulder_press": "Shoulder Press",
    "lateral_raise": "Lateral Raise",
    "deadlift": "Deadlift",
    "high_knee": "High Knee",
    "auto_detect": "Gym AI",
}

SQUAT_MISTAKE_IDS = {"shallow_squat", "squat_depth", "insufficient_depth", "not_deep_enough"}
HIP_MISTAKE_IDS = {"hips_low", "hips_sagging", "hip_sag", "hips_too_low", "dropped_hips"}


def _exercise_label(exercise_type: str, exercise_label: str | None = None) -> str:
    if exercise_label:
        return exercise_label
    return EXERCISE_LABELS.get(exercise_type, exercise_type.replace("_", " ").title())


def _range_cutoff(range_key: str) -> datetime | None:
    now = datetime.now(timezone.utc)
    if range_key == "7d":
        return now - timedelta(days=7)
    if range_key == "30d":
        return now - timedelta(days=30)
    return None


def _filter_workouts(
    workouts: list[WorkoutSession],
    range_key: str,
    exercise_type: str | None,
) -> list[WorkoutSession]:
    cutoff = _range_cutoff(range_key)
    result = workouts
    if cutoff is not None:
        result = [w for w in result if w.created_at >= cutoff]
    if exercise_type:
        result = [w for w in result if w.exercise_type == exercise_type]
    return result


def _compute_streak(workouts: list[WorkoutSession]) -> int:
    if not workouts:
        return 0

    days = {w.created_at.astimezone(timezone.utc).date() for w in workouts}
    today = datetime.now(timezone.utc).date()
    cursor = today if today in days else today - timedelta(days=1)
    streak = 0

    while cursor in days:
        streak += 1
        cursor -= timedelta(days=1)

    return streak


def _week_key(d: date) -> str:
    iso = d.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def _mistake_entries(workout: WorkoutSession) -> list[dict[str, Any]]:
    if not workout.mistakes:
        return []
    return [m for m in workout.mistakes if isinstance(m, dict)]


def _generate_insights(
    all_workouts: list[WorkoutSession],
    filtered: list[WorkoutSession],
    exercise_type: str | None,
) -> list[dict[str, str]]:
    insights: list[dict[str, str]] = []
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)
    prev_week_start = now - timedelta(days=14)

    this_week = [w for w in all_workouts if w.created_at >= week_start]
    last_week = [
        w for w in all_workouts if prev_week_start <= w.created_at < week_start
    ]

    if exercise_type:
        this_week = [w for w in this_week if w.exercise_type == exercise_type]
        last_week = [w for w in last_week if w.exercise_type == exercise_type]

    if this_week and last_week:
        this_avg = sum(w.form_score for w in this_week) / len(this_week)
        last_avg = sum(w.form_score for w in last_week) / len(last_week)
        if last_avg > 0:
            delta = ((this_avg - last_avg) / last_avg) * 100
            if delta >= 3:
                label = _exercise_label(exercise_type) if exercise_type else "Overall"
                insights.append(
                    {
                        "type": "form_improvement",
                        "tone": "positive",
                        "message": f"Your {label.lower()} form improved by {delta:.0f}% this week.",
                    }
                )
            elif delta <= -5:
                insights.append(
                    {
                        "type": "form_decline",
                        "tone": "warning",
                        "message": "Form scores dipped this week — focus on slow, controlled reps.",
                    }
                )

    mistake_counter: Counter[str] = Counter()
    mistake_labels: dict[str, str] = {}
    for workout in filtered:
        for item in _mistake_entries(workout):
            mid = str(item.get("id", ""))
            label = str(item.get("label", mid))
            count = int(item.get("count", 1))
            if mid:
                mistake_counter[mid] += count
                mistake_labels[mid] = label

    if mistake_counter:
        top_id, top_count = mistake_counter.most_common(1)[0]
        top_label = mistake_labels.get(top_id, top_id.replace("_", " "))
        insights.append(
            {
                "type": "common_mistake",
                "tone": "warning",
                "message": f"Your most common issue is {top_label.lower()}.",
            }
        )

        squat_related = [w for w in filtered if w.exercise_type in ("squat", "lunge")]
        shallow_hits = sum(
            1
            for w in squat_related
            for m in _mistake_entries(w)
            if str(m.get("id", "")) in SQUAT_MISTAKE_IDS
            or "depth" in str(m.get("label", "")).lower()
            or "deeper" in str(m.get("label", "")).lower()
        )
        if shallow_hits >= 2:
            insights.append(
                {
                    "type": "squat_depth",
                    "tone": "warning",
                    "message": "Squat depth needs improvement — aim for thighs parallel to the floor.",
                }
            )

    streak = _compute_streak(all_workouts)
    if streak >= 3:
        insights.append(
            {
                "type": "consistency",
                "tone": "positive",
                "message": f"Your consistency is improving — {streak}-day streak!",
            }
        )
    elif len(this_week) >= 2 and len(last_week) <= 1:
        insights.append(
            {
                "type": "consistency",
                "tone": "positive",
                "message": "Your consistency is improving — keep showing up.",
            }
        )

    if not insights and filtered:
        avg = sum(w.form_score for w in filtered) / len(filtered)
        insights.append(
            {
                "type": "general",
                "tone": "neutral",
                "message": f"Average form score is {avg:.0f}/100 in this period. Save more sessions to unlock deeper insights.",
            }
        )

    if not filtered:
        insights.append(
            {
                "type": "empty",
                "tone": "neutral",
                "message": "Complete and save workouts to unlock AI progress insights.",
            }
        )

    return insights[:5]


def compute_workout_analytics(
    workouts: list[WorkoutSession],
    range_key: str = "30d",
    exercise_type: str | None = None,
) -> dict[str, Any]:
    sorted_workouts = sorted(workouts, key=lambda w: w.created_at)
    filtered = _filter_workouts(sorted_workouts, range_key, exercise_type)

    total_workouts = len(filtered)
    total_reps = sum(w.total_reps for w in filtered)
    total_duration_seconds = sum(w.duration_seconds for w in filtered)

    if filtered:
        average_form_score = round(
            sum(w.form_score for w in filtered) / len(filtered), 1
        )
        best_form_score = round(max(w.form_score for w in filtered), 1)
    else:
        average_form_score = 0.0
        best_form_score = 0.0

    exercise_counts: Counter[str] = Counter()
    for w in filtered:
        exercise_counts[w.exercise_type] += 1

    best_exercise = None
    if exercise_counts:
        best_type = exercise_counts.most_common(1)[0][0]
        best_exercise = _exercise_label(best_type)

    mistake_counter: Counter[str] = Counter()
    mistake_labels: dict[str, str] = {}
    for workout in filtered:
        for item in _mistake_entries(workout):
            mid = str(item.get("id", "unknown"))
            label = str(item.get("label", mid))
            count = int(item.get("count", 1))
            mistake_counter[mid] += count
            mistake_labels[mid] = label

    most_common_mistake = None
    if mistake_counter:
        mid, _ = mistake_counter.most_common(1)[0]
        most_common_mistake = mistake_labels.get(mid, mid.replace("_", " "))

    score_by_date: dict[str, list[float]] = defaultdict(list)
    reps_by_date: dict[str, int] = defaultdict(int)
    duration_by_week: dict[str, int] = defaultdict(int)

    for workout in filtered:
        day = workout.created_at.astimezone(timezone.utc).date().isoformat()
        score_by_date[day].append(workout.form_score)
        reps_by_date[day] += workout.total_reps
        week = _week_key(workout.created_at.astimezone(timezone.utc).date())
        duration_by_week[week] += workout.duration_seconds

    score_over_time = [
        {"date": day, "score": round(sum(scores) / len(scores), 1)}
        for day, scores in sorted(score_by_date.items())
    ]
    reps_over_time = [
        {"date": day, "reps": reps} for day, reps in sorted(reps_by_date.items())
    ]
    exercise_distribution = [
        {
            "exercise": ex,
            "label": _exercise_label(ex),
            "count": count,
        }
        for ex, count in exercise_counts.most_common()
    ]
    mistakes_frequency = [
        {
            "mistake": mid,
            "label": mistake_labels.get(mid, mid.replace("_", " ")),
            "count": count,
        }
        for mid, count in mistake_counter.most_common(8)
    ]
    weekly_duration = [
        {"week": week, "minutes": round(seconds / 60, 1)}
        for week, seconds in sorted(duration_by_week.items())
    ]

    return {
        "total_workouts": total_workouts,
        "total_reps": total_reps,
        "average_form_score": average_form_score,
        "best_form_score": best_form_score,
        "current_streak": _compute_streak(sorted_workouts),
        "best_exercise": best_exercise,
        "most_common_mistake": most_common_mistake,
        "total_duration_seconds": total_duration_seconds,
        "score_over_time": score_over_time,
        "reps_over_time": reps_over_time,
        "exercise_distribution": exercise_distribution,
        "mistakes_frequency": mistakes_frequency,
        "weekly_duration": weekly_duration,
        "insights": _generate_insights(sorted_workouts, filtered, exercise_type),
    }
