import { Skeleton } from '@/components/ui/skeleton'
import { useLocation, Navigate } from 'react-router-dom'
import { fetchMe } from '@/api/auth'
import type { CurrentUser } from '@/api/types'
import { useQuery } from '@tanstack/react-query'


export function useMe(){
  return useQuery<CurrentUser | null>({
    queryKey: ['me'],
    queryFn: async() =>{
      try{
        return await fetchMe()
      } catch (e: unknown){
        const status = (e as {response?: {status?: number}})?.response?.status
        if (status === 401) return null
        throw e
      }
    },
    staleTime: 30_000,
    retry: false,
  })
}


interface RequireAuthProps{
  children: React.ReactNode
  role?: 'admin' | 'partner'
}


export function RequireAuth({children, role}: RequireAuthProps){
  const {data: me, isLoading} = useMe()
  const location = useLocation()

  if(isLoading){
    return(
      <div className="container py-6 space-y-3">
        <Skeleton className='h-6 w-1/3'/>
        <Skeleton className='h-32 w-full'/>
      </div>
    )
  }

  if(!me){
    return <Navigate to="/partner/login" replace state={{from: location.pathname}} />
  }

  if (role && me.role !== role){
    return (
      <div className="container py-6">
        <h2 className="text-lg font-semibold">Доступ запрещён</h2>
        <p className='text-sm text-muted-foreground'>
          Эта страница доступна только пользователю с ролью «{role}»
        </p>
      </div>
    )
  }

  return <>{children}</>
}
