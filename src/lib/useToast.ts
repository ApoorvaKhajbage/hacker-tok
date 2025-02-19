import { useState, useCallback } from 'react'

type ToastProps = {
  title?: string
  description?: string
  action?: React.ReactNode
  duration?: number
}

export function useToast() {
  const [isVisible, setIsVisible] = useState(false)
  const [toastProps, setToastProps] = useState<ToastProps>({})

  const toast = useCallback(
    ({ title, description, action, duration = 3000 }: ToastProps) => {
      setToastProps({ title, description, action })
      setIsVisible(true)
      setTimeout(() => setIsVisible(false), duration)
    },
    []
  )

  return { toast, isVisible, toastProps }
}