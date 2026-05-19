from __future__ import annotations

import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.auth.deps import require_partner
from app.models import User

router = APIRouter(prefix="/api/partner/uploads", tags=["partner:uploads"])

_ALLOWED_TYPES: dict[str, str] ={
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

_MAX_SIZE_BYTES = 5 * 1024 * 1024

_UPLOAD_DIR = Path("./uploads")


class UploadResponse(BaseModel):
    url: str


def _has_image_magic(data: bytes, content_type: str) -> bool:
    if len(data) < 12:
        return False
    if content_type == "image/jpeg":
        return data[:3] == b"\xff\xd8\xff"
    if content_type == "image/png":
        return data[:8] == b"\x89PNG\r\n\x1a\n"
    if content_type == "image/webp":
        return data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    return False


@router.post(
    "/image",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_image(
    file: Annotated[UploadFile, File(description="Изображение (JPEG/PNG/WEBP, до 5 МБ)")],
    _user: Annotated[User, Depends(require_partner)],
) -> UploadResponse:
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"(получено: {file.content_type})"
            ),
        )


    contents = await file.read(_MAX_SIZE_BYTES + 1)
    if len(contents) > _MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Файл слишком большой(максимум {_MAX_SIZE_BYTES // (1024 * 1024)} МБ)"
        )


    if not _has_image_magic(contents, file.content_type):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Файл не похож на изображение заявленного типа",
        )


    extension = _ALLOWED_TYPES[file.content_type]
    new_name = f"{uuid.uuid4().hex}{extension}"

    _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    out_path = _UPLOAD_DIR / new_name
    out_path.write_bytes(contents)

    return UploadResponse(url=f"/uploads/{new_name}")
