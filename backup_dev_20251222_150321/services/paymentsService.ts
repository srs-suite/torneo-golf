import axios from 'axios'

export const paymentsService = {
  async getSummary(clubId: number, params: { from?: string; to?: string } = {}) {
    const response = await axios.get(`/api/club/${clubId}/payments`, { params })
    return response.data.data || []
  },
  async getExpenses(clubId: number, params: { from?: string; to?: string } = {}) {
    const response = await axios.get(`/api/club/${clubId}/accounting/expenses`, { params })
    return response.data.data || []
  },
  async addExpense(clubId: number, data: { expense_date: string; amount: number; currency?: string; receipt_number?: string; detail?: string; custodian?: string }) {
    const response = await axios.post(`/api/club/${clubId}/accounting/expenses`, data)
    return response.data.data || response.data
  },
  async updateExpense(clubId: number, id: number, data: { expense_date: string; amount: number; currency?: string; receipt_number?: string; detail?: string; custodian?: string; account_id?: number }) {
    const response = await axios.put(`/api/club/${clubId}/accounting/expenses?id=${id}`, data)
    return response.data
  },
  async deleteExpense(clubId: number, id: number) {
    const response = await axios.delete(`/api/club/${clubId}/accounting/expenses?id=${id}`)
    return response.data
  },
  async getOtherIncomes(clubId: number, params: { from?: string; to?: string } = {}) {
    const response = await axios.get(`/api/club/${clubId}/accounting/incomes`, { params })
    return response.data.data || []
  },
  async addOtherIncome(clubId: number, data: { member_id?: number | string; income_date: string; amount: number; currency?: string; payment_type?: string; description?: string; custodian?: string }) {
    const response = await axios.post(`/api/club/${clubId}/accounting/incomes`, data)
    return response.data.data || response.data
  },
  async updateOtherIncome(clubId: number, id: number, data: { member_id?: number | string; income_date: string; amount: number; currency?: string; payment_type?: string; description?: string; custodian?: string; account_id?: number }) {
    const response = await axios.put(`/api/club/${clubId}/accounting/incomes?id=${id}`, data)
    return response.data
  },
  async deleteOtherIncome(clubId: number, id: number) {
    const response = await axios.delete(`/api/club/${clubId}/accounting/incomes?id=${id}`)
    return response.data
  },
  async getCurrencyExchanges(clubId: number, params: { from?: string; to?: string } = {}) {
    const response = await axios.get(`/api/club/${clubId}/accounting/exchanges`, { params })
    return response.data.data || []
  },
  async addCurrencyExchange(clubId: number, data: { 
    exchange_date: string; 
    from_currency: string; 
    from_amount: number;
    to_currency: string;
    to_amount: number;
    exchange_rate: number;
    notes?: string;
    from_account_id: number;
    to_account_id: number;
  }) {
    const response = await axios.post(`/api/club/${clubId}/accounting/exchanges`, data)
    return response.data.data || response.data
  },
  async updateCurrencyExchange(clubId: number, id: number, data: { 
    exchange_date: string; 
    from_currency: string; 
    from_amount: number;
    to_currency: string;
    to_amount: number;
    exchange_rate: number;
    notes?: string;
    from_account_id?: number;
    to_account_id?: number;
  }) {
    const response = await axios.put(`/api/club/${clubId}/accounting/exchanges?id=${id}`, data)
    return response.data
  },
  async deleteCurrencyExchange(clubId: number, id: number) {
    const response = await axios.delete(`/api/club/${clubId}/accounting/exchanges?id=${id}`)
    return response.data
  },
  async getCurrencyBalance(clubId: number) {
    const response = await axios.get(`/api/club/${clubId}/accounting/balance`)
    return response.data.data || { ARS: 0, USD: 0 }
  },
  async getCustodians(clubId: number) {
    const response = await axios.get(`/api/club/${clubId}/accounting/custodians`)
    return response.data.data || []
  }
}

