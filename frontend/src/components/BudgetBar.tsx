import { useState } from 'react';
import { Wallet, X } from 'lucide-react';
import { useBudgetStore } from '@/store/budget';
import { Button } from '@/components/ui/button';
import { formatRub } from '@/lib/format';
import { cn } from '@/lib/utils';


export function BudgetBar(){
  const budget = useBudgetStore((s) => s.budget)
  const setBudget = useBudgetStore((s) => s.setBudget)
  const clearBudget = useBudgetStore((s) => s.clearBudget)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>(budget != null ? String(budget): '')


  function commit(){
    const trimmed = draft.trim()
    if(trimmed === ''){
      clearBudget()
    }else{
      const num = Number(trimmed)
      if(Number.isFinite(num) && num >=0){
        setBudget(num)
      }
    }
    setEditing(false)
  }


  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(budget != null ? String(budget) : '')
          setEditing(true)
        }}
        className={cn(
          'flex w-full items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
          budget != null
            ? 'bg-primary/5 border-primary/30'
            : 'bg-background text-muted-foreground hover:bg-accent',
        )}
        aria-label="Изменить бюджет"
      >
        <Wallet className="h-4 w-4" aria-hidden />
        <span className="flex-1 text-left">
          {budget != null ? (
            <>
              Бюджет: <span className="font-medium text-foreground">{formatRub(budget)}</span>
            </>
          ) : (
            'Установить бюджет на вечер'
          )}
        </span>
      </button>
    )
  }


  return (
    <div className='flex items-center gap-2 rounded-md border bg-background px-3 py-1.5'>
      <Wallet className='h-4 w-4 text-muted-foreground' aria-hidden/>
      <input
      autoFocus
      type="number"
      inputMode='numeric'
      min={0}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) =>{
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setEditing(false)
      }}
    placeholder='например, 1500'
    className='flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground'
      />
    <span className='text-sm muted-foreground'>₽</span>
    {budget != null &&(
      <Button
      type='button'
      size='icon'
      variant='ghost'
      aria-label='Сбросить бюджет'
      onClick={() => {
        clearBudget()
        setDraft('')
        setEditing(false)
      }}
      className='h-7 w-7'
      >
        <X className='h-3.5 w-3.5'/>
      </Button>
    )}
    </div>
  )
}
