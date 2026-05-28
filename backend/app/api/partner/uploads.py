from __future__ import annotations

import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.auth.deps import require_partner
from app.models import User

"""
uploads - загрузка картинок партнёром.
Принимает файл (JPEG/PNG/WEBP, до 5 МБ), проверяет что это реально картинка по
сигнатуре байт (magic number), сохраняет в ./uploads/ со случайным именем и
возвращает URL. Используется фронтом везде, где партнёр выбирает фото — заведение,
блюда, события.

Важно: формат определяется ТОЛЬКО по содержимому файла, а не по заголовку
content_type из браузера. Браузеры и ОС присылают для одного и того же .jpg то
"image/jpeg", то "image/jpg", то "application/octet-stream", то вовсе пустую
строку — поэтому доверять заявленному типу нельзя (иначе .jpg периодически
отлетает с ошибкой 415, особенно на проде с реальными фото с телефона).
"""

router = APIRouter(prefix="/api/partner/uploads", tags=["partner:uploads"])

# Сопоставление "каноничный MIME-тип -> расширение файла на диске".
# Ключи здесь — это то, что возвращает _sniff_image_type (по сигнатуре байт),
# а НЕ то, что прислал клиент в content_type.
_EXTENSION_BY_TYPE: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

# Человекочитаемый список форматов для текстов ошибок.
_ALLOWED_LABEL = "JPEG, PNG или WEBP"

_MAX_SIZE_BYTES = 5 * 1024 * 1024

_UPLOAD_DIR = Path("./uploads")


class UploadResponse(BaseModel):
    url: str


def _sniff_image_type(data: bytes) -> str | None:
    """Определяет реальный формат картинки по первым байтам (magic number).

    Возвращает каноничный MIME-тип ("image/jpeg" / "image/png" / "image/webp")
    либо None, если ни одна известная сигнатура не совпала. Заявленный клиентом
    content_type здесь сознательно игнорируется.
    """
    # Меньше 12 байт — слишком коротко даже для заголовка WEBP, это не картинка.
    if len(data) < 12:
        return None
    # JPEG/JPG: любой файл начинается с маркера SOI 0xFFD8 + начало сегмента 0xFF.
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    # PNG: фиксированная 8-байтовая сигнатура.
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    # WEBP: контейнер RIFF, где байты 8..11 содержат метку "WEBP".
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
    # Читаем не более (лимит + 1) байт: если прочиталось больше лимита — файл
    # слишком большой, и при этом мы не тянем в память гигантский payload целиком.
    contents = await file.read(_MAX_SIZE_BYTES + 1)
    if len(contents) > _MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Файл слишком большой (максимум {_MAX_SIZE_BYTES // (1024 * 1024)} МБ)",
        )

    # Определяем формат по содержимому. Это и есть фикс «jpg не грузится»:
    # неважно, что прислал браузер в content_type — решает сигнатура байт.
    image_type = _sniff_image_type(contents)
    if image_type is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Файл не похож на изображение. Поддерживаются {_ALLOWED_LABEL}.",
        )

    extension = _EXTENSION_BY_TYPE[image_type]
    new_name = f"{uuid.uuid4().hex}{extension}"

    # Каталог обычно уже создан на старте приложения (см. main.py), но создаём
    # его и здесь на случай, если том примонтировали пустым.
    _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    out_path = _UPLOAD_DIR / new_name
    out_path.write_bytes(contents)

    return UploadResponse(url=f"/uploads/{new_name}")
