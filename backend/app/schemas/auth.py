from pydantic import BaseModel, EmailStr, field_validator, model_validator


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str
    role: str = "demo_user"

    @field_validator("name")
    @classmethod
    def name_length(cls, v):
        if len(v.strip()) < 2 or len(v.strip()) > 100:
            raise ValueError("Name must be 2–100 characters")
        return v.strip()

    @field_validator("role")
    @classmethod
    def valid_role(cls, v):
        allowed = {"demo_user", "clinician"}
        if v not in allowed:
            raise ValueError(f"Role must be one of: {allowed}")
        return v

    @field_validator("password")
    @classmethod
    def strong_password(cls, v):
        if len(v) < 8:
            raise ValueError("Min 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Need 1 uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Need 1 digit")
        return v

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords don't match")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
