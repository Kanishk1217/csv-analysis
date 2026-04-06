import { useState } from 'react'
import { trainModel, fetchCorrelations } from '../api/client'
import type { TrainResponse, CorrelationResponse } from '../types'

export function useModel(file: File | null) {
  const [result, setResult]        = useState<TrainResponse | null>(null)
  const [correlations, setCorr]    = useState<CorrelationResponse | null>(null)
  const [loading, setLoading]      = useState(false)
  const [corrLoading, setCorrLoad] = useState(false)
  const [error, setError]          = useState<string | null>(null)
  const [corrError, setCorrError]  = useState<string | null>(null)

  async function train(target: string, algorithm: string, testSize: number) {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await trainModel(file, target, algorithm, testSize)
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Training failed')
    } finally {
      setLoading(false)
    }
  }

  async function loadCorrelations() {
    if (!file || corrLoading || correlations) return
    setCorrLoad(true)
    setCorrError(null)
    try {
      const res = await fetchCorrelations(file)
      setCorr(res)
    } catch (e: unknown) {
      setCorrError(e instanceof Error ? e.message : 'Failed to load correlations')
    } finally {
      setCorrLoad(false)
    }
  }

  return { result, correlations, loading, corrLoading, corrError, error, train, loadCorrelations }
}
