from sqlalchemy import Column, Integer, String, Date, Time, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ScheduleConfig(Base):
    __tablename__ = "schedule_configs"

    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday to 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    break_start = Column(Time, nullable=True)
    break_end = Column(Time, nullable=True)
    is_active = Column(Boolean, default=True)

    barber = relationship("Barber", back_populates="schedule_configs")


class DayOff(Base):
    __tablename__ = "days_off"

    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("barbers.id"), nullable=True)
    date = Column(Date, nullable=False)
    reason = Column(String, nullable=True)

    barber = relationship("Barber", back_populates="days_off")
