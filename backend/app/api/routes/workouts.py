from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.workout import WorkoutSession
from app.schemas.workout import WorkoutAnalyticsResponse, WorkoutCreate, WorkoutResponse
from app.services.analytics import compute_workout_analytics

router = APIRouter(prefix="/workouts", tags=["workouts"])


@router.post("", response_model=WorkoutResponse, status_code=status.HTTP_201_CREATED)
def create_workout(
    payload: WorkoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mistakes_data = None
    if payload.mistakes is not None:
        mistakes_data = [
            m.model_dump() if hasattr(m, "model_dump") else m for m in payload.mistakes
        ]

    workout = WorkoutSession(
        user_id=current_user.id,
        exercise_type=payload.exercise_type,
        exercise_label=payload.exercise_label,
        total_reps=payload.total_reps,
        good_reps=payload.good_reps,
        bad_reps=payload.bad_reps,
        form_score=payload.form_score,
        duration_seconds=payload.duration_seconds,
        best_plank_hold_seconds=payload.best_plank_hold_seconds,
        mistakes=mistakes_data,
        grade=payload.grade,
        gym_log=payload.gym_log,
    )
    db.add(workout)
    db.commit()
    db.refresh(workout)
    return workout


@router.get("", response_model=list[WorkoutResponse])
def list_workouts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workouts = db.scalars(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.created_at.desc())
    ).all()
    return workouts


@router.get("/analytics", response_model=WorkoutAnalyticsResponse)
def get_workout_analytics(
    range: str = Query("30d", pattern="^(7d|30d|all)$"),
    exercise_type: str | None = Query(None, max_length=64),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workouts = db.scalars(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.created_at.asc())
    ).all()
    data = compute_workout_analytics(workouts, range_key=range, exercise_type=exercise_type)
    return data


@router.get("/{workout_id}", response_model=WorkoutResponse)
def get_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = db.get(WorkoutSession, workout_id)
    if not workout or workout.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")
    return workout


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workout = db.get(WorkoutSession, workout_id)
    if not workout or workout.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")
    db.delete(workout)
    db.commit()
    return None
