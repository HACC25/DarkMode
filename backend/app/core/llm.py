from app.core.config import settings

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

model = OpenAIChatModel(settings.OPENAI_LLM, provider=OpenAIProvider(api_key=settings.OPENAI_API_KEY))
agent = Agent(model)


JOB_PROMPT = """"""
SCREEN_PROMPT =""""""


def get_job_agent():
    pass