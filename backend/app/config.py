from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"

    salary_increase_threshold: float = 10.00
    payroll_change_threshold: float = 10.00

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()