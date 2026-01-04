"""adding applications table
Revision ID: adf380e3bf6c
Revises: 6adaa8e6a312
Create Date: 2025-12-30 14:48:21.232013
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "adf380e3bf6c"
down_revision: str | None = "6adaa8e6a312"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # First, ensure users table has proper constraints
    op.create_unique_constraint("uq_users_email", "users", ["email"])
    op.create_unique_constraint("uq_users_supabase_id", "users", ["supabase_id"])

    # Then create the applications table
    op.create_table(
        "applications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.String(), nullable=False),
        sa.Column("job_title", sa.String(), nullable=True),
        sa.Column("company_name", sa.String(), nullable=True),
        sa.Column("applied_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes
    op.create_index(op.f("ix_applications_id"), "applications", ["id"], unique=False)
    op.create_index(
        op.f("ix_applications_job_id"), "applications", ["job_id"], unique=False
    )


def downgrade() -> None:
    # Drop in reverse order
    op.drop_index(op.f("ix_applications_job_id"), table_name="applications")
    op.drop_index(op.f("ix_applications_id"), table_name="applications")
    op.drop_table("applications")

    op.drop_constraint("uq_users_supabase_id", "users", type_="unique")
    op.drop_constraint("uq_users_email", "users", type_="unique")
