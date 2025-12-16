from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Import settings to get DATABASE_URL
from app.core.config import settings

# Import your Base
from app.db import Base

# ruff: noqa: F401
from app.models.comment import FeedbackComment
from app.models.feedback import Feedback
from app.models.interview import Interview
from app.models.question_answer import QuestionAnswer
from app.models.resume_models import Education, Language, Project, Skill, WorkExperience
from app.models.user import User

# Alembic Config object
config = context.config

# Set database URL programmatically from your settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Set up Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata - this is what Alembic uses to detect your tables
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
