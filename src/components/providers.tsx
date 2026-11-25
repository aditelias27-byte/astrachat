'use client'

import { useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/toaster'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('astrachat_theme')
    const dark = saved ? saved === 'dark' : true
    document.documentElement.classList.toggle('dark', dark)
  }, [])
  return (
    <>
      {children}
      {mounted && <Toaster />}
    </>
  )
}
