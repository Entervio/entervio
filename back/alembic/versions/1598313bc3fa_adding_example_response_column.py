"""Adding example response column
Revision ID: 1598313bc3fa
Revises: adf380e3bf6c
Create Date: 2026-01-02 17:44:34.835325
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "1598313bc3fa"
down_revision: str | None = "adf380e3bf6c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "question_answers", sa.Column("response_example", sa.Text(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("question_answers", "response_example")
