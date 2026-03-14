import client from './client'

export const generateReport = (data) =>
    client.post('/report/generate', data, { responseType: 'blob' })

export const getReport = (predictionId) =>
    client.get(`/report/${predictionId}`, { responseType: 'blob' })
