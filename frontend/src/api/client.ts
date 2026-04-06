import axios, { AxiosError } from 'axios'
import type { UploadResponse, CorrelationResponse, TrainResponse } from '../types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const api = axios.create({ baseURL: BASE, timeout: 120_000 })

function extractError(e: unknown): string {
  if (e instanceof AxiosError) {
    const detail = e.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (e.response?.status === 0 || !e.response) return 'Cannot reach the server. Check your API URL.'
    return `Server error ${e.response.status}`
  }
  return String(e)
}

export async function pingServer(): Promise<void> {
  await api.get('/health').catch(() => {})
}

export async function uploadCSV(file: File): Promise<UploadResponse> {
  try {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<UploadResponse>('/upload', form)
    return data
  } catch (e) {
    throw new Error(extractError(e))
  }
}

export async function fetchCorrelations(file: File): Promise<CorrelationResponse> {
  try {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<CorrelationResponse>('/correlations', form)
    return data
  } catch (e) {
    throw new Error(extractError(e))
  }
}

export async function trainModel(
  file: File,
  target: string,
  algorithm: string,
  testSize: number,
): Promise<TrainResponse> {
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('target', target)
    form.append('algorithm', algorithm)
    form.append('test_size', String(testSize / 100))
    const { data } = await api.post<TrainResponse>('/train', form)
    return data
  } catch (e) {
    throw new Error(extractError(e))
  }
}
