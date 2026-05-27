import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMe } from '@/lib/auth'


export function LoginPage() {
  const { data: me } = useMe()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (user) => {
      queryClient.setQueryData(['me'], user)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/partner/dashboard', { replace: true })
    },
  })


  if (me) {
    return <Navigate to="/partner/dashboard" replace />
  }


  const errorText = mutation.isError
    ? ((mutation.error as { response?: { status?: number } })?.response?.status === 429
        ? 'Слишком много попыток входа. Подождите минуту.'
        : 'Неверный email или пароль.')
    : null

    
  return (
    <div className="min-h-svh grid place-items-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Вход для партнёров</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate()
            }}
          >
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {errorText && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive"
              >
                {errorText}
              </div>
            )}

            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? 'Входим…' : 'Войти'}
            </Button>
          </form>

          <div className="mt-4 text-xs text-muted-foreground">
            Нет кабинета?{' '}
            <Link to="/partner/register" className="underline">
              Оставить заявку
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
