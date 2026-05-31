from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    exercise_type: Mapped[str] = mapped_column(String(64), nullable=False)
    exercise_label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    total_reps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    good_reps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bad_reps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    form_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_plank_hold_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mistakes: Mapped[list | None] = mapped_column(JSON, nullable=True)
    grade: Mapped[str] = mapped_column(String(2), nullable=False)
    gym_log: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="workout_sessions")
