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
  async addExpense(clubId: number, data: { expense_date: string; amount: number; receipt_number?: string; detail?: string }) {
    const response = await axios.post(`/api/club/${clubId}/accounting/expenses`, data)
    return response.data.data || response.data
  },
  async deleteExpense(clubId: number, id: number) {
    const response = await axios.delete(`/api/club/${clubId}/accounting/expenses`, { params: { id } })
    return response.data
  }
}

