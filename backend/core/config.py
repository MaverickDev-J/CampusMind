"""Application settings – reads from env vars with sensible defaults."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "campus_ai"

    JWT_SECRET: str = "super-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    ADMIN_SECRET_KEY: str = "TCET_HACK_2026"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
