do not write tests, do not run tests
do not format or lint

always use UUIDs for primary keys

generate migration with
alembic revision --autogenerate -m "some message"

apply migration with
alembic upgrade head

to install a package, in backend folder run
uv install <package>

for creating frontend components. in Chakra UI, do not put ANY styles on the components. Not even padding. keep them bare for now.