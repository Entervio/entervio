"""add application model
Revision ID: 66bc74123c8d
Revises: 6adaa8e6a312
Create Date: 2025-12-27 14:39:43.744556
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "66bc74123c8d"
down_revision: str | None = "6adaa8e6a312"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Detect if we're using SQLite
    conn = op.get_bind()
    if conn.dialect.name == "sqlite":
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.create_unique_constraint("uq_users_email", ["email"])
            batch_op.create_unique_constraint("uq_users_supabase_id", ["supabase_id"])
    else:
        op.create_unique_constraint("uq_users_email", "users", ["email"])
        op.create_unique_constraint("uq_users_supabase_id", "users", ["supabase_id"])


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == "sqlite":
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.drop_constraint("uq_users_email", type_="unique")
            batch_op.drop_constraint("uq_users_supabase_id", type_="unique")
    else:
        op.drop_constraint("uq_users_email", "users", type_="unique")
        op.drop_constraint("uq_users_supabase_id", "users", type_="unique")
