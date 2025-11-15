"""add new job status enums

Revision ID: 3f73820144a3
Revises: 6775f68dca37
Create Date: 2025-11-14 19:25:30.032536

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '3f73820144a3'
down_revision = '6775f68dca37'
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TYPE job_application_status_enum "
        "ADD VALUE IF NOT EXISTS 'INTERVIEW' AFTER 'UNDER_REVIEW'"
    )
    op.execute(
        "ALTER TYPE job_application_status_enum "
        "ADD VALUE IF NOT EXISTS 'ACCEPTED' AFTER 'INTERVIEW'"
    )


def downgrade():
    bind = op.get_bind()
    new_type = sa.Enum(
        'SUBMITTED',
        'UNDER_REVIEW',
        'REJECTED',
        'WITHDRAWN',
        name='job_application_status_enum',
    )

    op.execute("ALTER TYPE job_application_status_enum RENAME TO job_application_status_enum_old")
    new_type.create(bind)
    op.alter_column(
        'job_application',
        'status',
        type_=new_type,
        postgresql_using="status::text::job_application_status_enum",
    )
    op.execute("DROP TYPE job_application_status_enum_old")
