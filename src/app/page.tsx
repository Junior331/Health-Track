"use client";

import { Providers } from './providers'
import HealthMonitor from '@/components/HealthMonitor'

export default function Home() {
  return (
    <Providers>
      <HealthMonitor />
    </Providers>
  )
}