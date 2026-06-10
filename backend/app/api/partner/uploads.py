from __future__ import annotations

import uuid
from io import BytesIO
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image
from pydantic import BaseModel

from app.auth.deps import require_partner
from app.models import User


router = APIRouter(prefix="/api/partner/uploads", tags=["partner:uploads"])

_EXTENSION_BY_TYPE: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

_ALLOWED_LABEL = "JPEG, PNG или WEBP"

_MAX_SIZE_BYTES = 5 * 1024 * 1024

_MAX_DIMENSION = 1600

_PIL_FORMAT_BY_TYPE: dict[str, str] = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
}

_UPLOAD_DIR = Path("./uploads")


class UploadResponse(BaseModel):
    url: str


def _downscale_image(data: bytes, image_type: str) -> bytes:
    try:
        img = Image.open(BytesIO(data))
        img.load()
    except Exception:
        return data

    if max(img.size) <= _MAX_DIMENSION:
        return data

    img.thumbnail((_MAX_DIMENSION, _MAX_DIMENSION))
    fmt = _PIL_FORMAT_BY_TYPE[image_type]
    buf = BytesIO()
    if fmt == "JPEG":
        img.convert("RGB").save(buf, "JPEG", quality=82, optimize=True)
    elif fmt == "WEBP":
        img.save(buf, "WEBP", quality=82, method=6)
    else:
        img.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def _sniff_image_type(data: bytes) -> str | None:
    if len(data) < 12:
        return None
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


@router.post(
    "/image",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_image(
    file: Annotated[UploadFile, File(description="Изображение (JPEG/PNG/WEBP, до 5 МБ)")],
    _user: Annotated[User, Depends(require_partner)],
) -> UploadResponse:

    contents = await file.read(_MAX_SIZE_BYTES + 1)
    if len(contents) > _MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Файл слишком большой (максимум {_MAX_SIZE_BYTES // (1024 * 1024)} МБ)",
        )

    image_type = _sniff_image_type(contents)
    if image_type is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Файл не похож на изображение. Поддерживаются {_ALLOWED_LABEL}.",
        )

    contents = _downscale_image(contents, image_type)

    extension = _EXTENSION_BY_TYPE[image_type]
    new_name = f"{uuid.uuid4().hex}{extension}"

    _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    out_path = _UPLOAD_DIR / new_name
    out_path.write_bytes(contents)

    return UploadResponse(url=f"/uploads/{new_name}")
