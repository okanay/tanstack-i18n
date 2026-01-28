import type { ErrorComponentProps } from '@tanstack/react-router'

export function DefaultError({ error, reset }: ErrorComponentProps) {
  return (
    <div>
      {error.message}
      <button onClick={reset}>reset</button>
    </div>
  )
}
