from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    phone: str | None = None


class UserUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1)
    last_name: str | None = Field(None, min_length=1)
    phone: str | None = None


class UserDetailed(UserBase):
    id: int
    has_resume: bool

    model_config = ConfigDict(from_attributes=True)
