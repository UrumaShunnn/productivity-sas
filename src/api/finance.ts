import { apiRequest } from './client'
import type { Sale } from '../types'

const currentMonth = () => new Date().toISOString().slice(0, 7)

export const listSales = (month?: string) =>
  apiRequest<{ sales: Sale[]; monthlyGoal: number }>(
    'GET', `/finance?month=${month ?? currentMonth()}`,
  )

export const createSale = (body: Omit<Sale, 'id'>) =>
  apiRequest<Sale>('POST', '/finance', body)

export const deleteSale = (id: string) =>
  apiRequest<void>('DELETE', `/finance/${id}`)

export const getFinanceStats = () =>
  apiRequest<Array<{ month: string; total: number; count: number }>>('GET', '/finance/stats')
