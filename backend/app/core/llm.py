from typing import Annotated

from fastapi import Depends
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from app.core.config import settings

_model = OpenAIChatModel(
    settings.OPENAI_LLM,
    provider=OpenAIProvider(api_key=settings.OPENAI_API_KEY),
)


JOB_PROMPT = """You transform unstructured job descriptions into structured listings.
Return strictly structured output adhering to the provided schema."""

SCREEN_PROMPT = """You evaluate how well a resume aligns with a job listing.
For each qualification, assign a status of HIGHLY_QUALIFIED, QUALIFIED, MEETS, or NOT_QUALIFIED and explain why.
The ScreeningReason must match one to one with the minimum requirements and the preferred requirements. the order matters."""

_job_agent = Agent(model=_model, system_prompt=JOB_PROMPT)
_screen_agent = Agent(model=_model, system_prompt=SCREEN_PROMPT)


def get_job_agent() -> Agent:
    return _job_agent


def get_screen_agent() -> Agent:
    return _screen_agent


JobAgentDep = Annotated[Agent, Depends(get_job_agent)]
ScreenAgentDep = Annotated[Agent, Depends(get_screen_agent)]
