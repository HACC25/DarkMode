from dotenv import load_dotenv
from pydantic_ai import Agent
import os

load_dotenv()

agent = Agent(os.getenv("LLM"), instructions="You are a helpful assistant.")
