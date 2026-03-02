from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
import datetime
import uuid
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

    projects = relationship("Project", back_populates="owner")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    template_url = Column(String, nullable=True)     # Stores the base certificate image URL
    mapping_data = Column(JSON, nullable=True)       # Stores the React placeholders array configuration
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="projects")
    certificates = relationship("Certificate", back_populates="project")

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    recipient_email = Column(String, index=True)
    recipient_name = Column(String)
    image_url = Column(String, nullable=True)     # The final composited certificate PNG/PDF S3 link
    issued_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_revoked = Column(Boolean, default=False)

    project = relationship("Project", back_populates="certificates")
