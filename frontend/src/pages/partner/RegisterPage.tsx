import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, Navigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import {
  registerPartner,
  type PartnerRegisterRequest,
} from '@/api/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMe } from '@/lib/auth'


export function RegisterPage() {
  const { data: me } = useMe()


  if (me) {
    return <Navigate to="/partner/dashboard" replace />
  }

  return (
    <div className="min-h-svh grid place-items-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Заявка для партнёра</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Оставьте заявку, чтобы добавить ваше заведение в Hanna. Администратор
            проверит данные и активирует кабинет.
          </p>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <div className="mt-4 text-xs text-muted-foreground">
            Уже есть кабинет?{' '}
            <Link to="/partner/login" className="underline">
              Войти
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RegisterForm() {
  const [form, setForm] = useState<PartnerRegisterRequest>({
    email: '',
    password: '',
    contact_name: '',
    place_name: '',
    place_address: '',
    place_phone: '',
    place_description: '',
  })

  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => registerPartner(form),
  })

  function update<K extends keyof PartnerRegisterRequest>(
    key: K,
    value: PartnerRegisterRequest[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setClientError(null)


    if (form.password.length < 8) {
      setClientError('Пароль должен быть не короче 8 символов.')
      return
    }
    if (form.password !== confirmPassword) {
      setClientError('Пароли не совпадают.')
      return
    }
    if (!agreedToTerms) {
      setClientError(
        'Чтобы продолжить, подтвердите согласие с пользовательским соглашением.',
      )
      return
    }

    mutation.mutate()
  }


  const serverError = mutation.isError
    ? extractServerError(mutation.error)
    : null


  if (mutation.isSuccess) {
    return (
      <div className="space-y-3 rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-900">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Заявка отправлена
        </div>
        <p>
          {mutation.data.message}
        </p>
        <Link
          to="/partner/login"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Перейти к входу
        </Link>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Контактная информация</h3>
        <Field
          id="email"
          label="Email (логин)"
          type="email"
          autoComplete="username"
          required
          value={form.email}
          onChange={(v) => update('email', v)}
        />
        <Field
          id="contact_name"
          label="Имя контактного лица"
          required
          value={form.contact_name}
          onChange={(v) => update('contact_name', v)}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            id="password"
            label="Пароль"
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(v) => update('password', v)}
            help="Минимум 8 символов"
          />
          <Field
            id="confirm"
            label="Повторите пароль"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">О заведении</h3>
        <Field
          id="place_name"
          label="Название"
          required
          value={form.place_name}
          onChange={(v) => update('place_name', v)}
        />
        <Field
          id="place_address"
          label="Адрес"
          required
          value={form.place_address}
          onChange={(v) => update('place_address', v)}
          help="Точные координаты администратор проставит при модерации"
        />
        <Field
          id="place_phone"
          label="Телефон (необязательно)"
          type="tel"
          value={form.place_phone ?? ''}
          onChange={(v) => update('place_phone', v)}
        />
        <div>
          <label htmlFor="place_description" className="mb-1 block text-sm font-medium">
            Краткое описание (необязательно)
          </label>
          <textarea
            id="place_description"
            rows={3}
            value={form.place_description ?? ''}
            onChange={(e) => update('place_description', e.target.value)}
            maxLength={2000}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </section>

      <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
        />
        <span>
          Я ознакомлен и принимаю условия{' '}
          <Link
            to="/legal/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Пользовательского соглашения
          </Link>{' '}
          и даю согласие на обработку моих персональных данных в соответствии
          с Федеральным законом № 152-ФЗ.
        </span>
      </label>

      {(clientError || serverError) && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive"
        >
          {clientError ?? serverError}
        </div>
      )}

      <Button
        type="submit"
        disabled={mutation.isPending || !agreedToTerms}
        className="w-full"
      >
        {mutation.isPending ? 'Отправляем…' : 'Отправить заявку'}
      </Button>
    </form>
  )
}


function Field(props: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  autoComplete?: string
  help?: string
}) {
  return (
    <div>
      <label htmlFor={props.id} className="mb-1 block text-sm font-medium">
        {props.label}
      </label>
      <input
        id={props.id}
        type={props.type ?? 'text'}
        autoComplete={props.autoComplete}
        required={props.required}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {props.help && (
        <p className="mt-1 text-xs text-muted-foreground">{props.help}</p>
      )}
    </div>
  )
}


function extractServerError(error: unknown): string {
  const status = (error as { response?: { status?: number } } | null)?.response
    ?.status
  if (status === 409) return 'Этот email уже используется. Попробуйте войти или укажите другой адрес.'
  if (status === 422) return 'Проверьте корректность заполнения полей.'
  if (status === 429) return 'Слишком много попыток. Подождите минуту и попробуйте снова.'
  return 'Не удалось отправить заявку. Попробуйте позже.'
}
