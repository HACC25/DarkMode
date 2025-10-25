do not write tests, do not run tests
do not format or lint

always use UUIDs for primary keys

generate migration with
alembic revision --autogenerate -m "some message"

apply migration with
alembic upgrade head

to install a package, in backend folder run
uv install <package>