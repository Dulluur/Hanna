import heic2any from 'heic2any'
import { uploadImage } from '@/api/partner'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024


export async function maybeConvertHeic(file: File): Promise<File> {
  const name = file.name.toLowerCase()
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  if (!isHeic) return file

  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  const blob = Array.isArray(converted) ? converted[0] : converted
  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
  return new File([blob], newName, { type: 'image/jpeg' })
}


export async function uploadImageFile(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `Файл слишком большой - максимум ${MAX_IMAGE_BYTES / (1024 * 1024)} МБ`,
    )
  }
  const prepared = await maybeConvertHeic(file)
  return uploadImage(prepared)
}

export const IMAGE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif'
