import {api} from './client'
import type { CurrentUser } from './types'


export async function login(email: string, password:string):
Promise<CurrentUser>{
  const{data} = await api.post<CurrentUser>('/auth/login', {
    email, password
  })
  return data
}


export async function logout(): Promise<void>{
  await api.post('/auth/logout')
}


export async function fetchMe(): Promise<CurrentUser>{
  const {data} = await api.get<CurrentUser>('/auth/me')
  return data
}


export interface PartnerRegisterRequest{
  email: string
  password: string
  contact_name: string
  place_name: string
  place_address: string
  place_phone?: string
  place_description?: string
}


export interface PartnerRegisterResponse{
  status: string
  message: string
}


export async function registerPartner(
  body: PartnerRegisterRequest,
): Promise<PartnerRegisterResponse>{
  const {data} = await api.post<PartnerRegisterResponse>(
    '/auth/partner/register',
    body,
  )
  return data
}
