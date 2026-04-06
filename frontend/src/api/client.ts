import axios from 'axios'
import type { UploadResponse, CorrelationResponse, TrainResponse } from '../types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const api = axios.create({ baseURL: BASE })

export async function uploadCSV(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<UploadResponse>('/upload', form)
  return data
}

export async function fetchCorrelations(file: File): Promise<CorrelationResponse> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<CorrelationResponse>('/correlations', form)
  return data
}

export async function trainModel(
  file: File,
  target: string,
  algorithm: string,
  testSize: number,
): Promise<TrainResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('target', target)
  form.append('algorithm', algorithm)
  form.append('test_size', String(testSize / 100))
  const { data } = await api.post<TrainResponse>('/train', form)
  return data
}
