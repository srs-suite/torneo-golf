import axios from 'axios'

export interface Account {
  account_id: number
  club_id: number
  account_name: string
  current_balance_ars: number
  current_balance_usd: number
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  transaction_id: number
  club_id: number
  transaction_type: 'income_tournament' | 'income_other' | 'expense' | 'transfer' | 'adjustment'
  transaction_date: string
  from_account_id?: number
  to_account_id?: number
  from_account_name?: string
  to_account_name?: string
  amount: number
  currency: string
  description?: string
  reference_type?: string
  reference_id?: number
  created_by?: number
  created_at: string
}

export const accountsService = {
  async getAccounts(clubId: number) {
    const response = await axios.get(`/api/club/${clubId}/accounting/accounts`)
    return response.data.data || []
  },
  
  async createAccount(clubId: number, data: { account_name: string; description?: string }) {
    const response = await axios.post(`/api/club/${clubId}/accounting/accounts`, data)
    return response.data
  },
  
  async updateAccount(clubId: number, accountId: number, data: { account_name: string; description?: string }) {
    const response = await axios.put(`/api/club/${clubId}/accounting/accounts?id=${accountId}`, data)
    return response.data
  },
  
  async deleteAccount(clubId: number, accountId: number) {
    const response = await axios.delete(`/api/club/${clubId}/accounting/accounts?id=${accountId}`)
    return response.data
  },
  
  async getTransactions(clubId: number, params: { from?: string; to?: string } = {}) {
    const response = await axios.get(`/api/club/${clubId}/accounting/transactions`, { params })
    return response.data.data || []
  },
  
  async createTransaction(clubId: number, data: {
    transaction_type: string
    transaction_date: string
    from_account_id?: number
    to_account_id?: number
    amount: number
    currency?: string
    description?: string
    reference_type?: string
    reference_id?: number
  }) {
    const response = await axios.post(`/api/club/${clubId}/accounting/transactions`, data)
    return response.data
  }
}

