from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class MistakeItem(BaseModel):
    id: str
    label: str
    count: int


class WorkoutCreate(BaseModel):
    exercise_type: str = Field(max_length=64)
    exercise_label: str | None = Field(default=None, max_length=128)
    total_reps: int = Field(default=0, ge=0)
    good_reps: int = Field(default=0, ge=0)
    bad_reps: int = Field(default=0, ge=0)
    form_score: float = Field(default=0, ge=0, le=100)
    duration_seconds: int = Field(default=0, ge=0)
    best_plank_hold_seconds: int = Field(default=0, ge=0)
    mistakes: list[MistakeItem] | list[dict[str, Any]] | None = None
    grade: str = Field(max_length=2)
    gym_log: list[dict[str, Any]] | None = None


class WorkoutResponse(BaseModel):
    id: int
    exercise_type: str
    exercise_label: str | None = None
    total_reps: int
    good_reps: int
    bad_reps: int
    form_score: float
    duration_seconds: int
    best_plank_hold_seconds: int
    mistakes: list | None = None
    grade: str
    gym_log: list | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ScoreOverTimePoint(BaseModel):
    date: str
    score: float


class RepsOverTimePoint(BaseModel):
    date: str
    reps: int


class ExerciseDistributionItem(BaseModel):
    exercise: str
    label: str
    count: int


class MistakeFrequencyItem(BaseModel):
    mistake: str
    label: str
    count: int


class WeeklyDurationItem(BaseModel):
    week: str
    minutes: float


class InsightItem(BaseModel):
    type: str
    message: str
    tone: str


class WorkoutAnalyticsResponse(BaseModel):
    total_workouts: int
    total_reps: int
    average_form_score: float
    best_form_score: float
    current_streak: int
    best_exercise: str | None = None
    most_common_mistake: str | None = None
    total_duration_seconds: int
    score_over_time: list[ScoreOverTimePoint]
    reps_over_time: list[RepsOverTimePoint]
    exercise_distribution: list[ExerciseDistributionItem]
    mistakes_frequency: list[MistakeFrequencyItem]
    weekly_duration: list[WeeklyDurationItem]
    insights: list[InsightItem]
