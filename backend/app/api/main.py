from fastapi import APIRouter

from app.api.routes import items, login, private, users, utils
from app.core.config import settings
from app.services.files import routes as files
from app.services.jobs import routes as jobs
from app.services.resumes import routes as resumes

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(files.router)
api_router.include_router(jobs.router)
api_router.include_router(resumes.router)
if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
