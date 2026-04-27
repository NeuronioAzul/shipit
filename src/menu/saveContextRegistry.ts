export type SaveContextStatus = 'saved' | 'no-changes' | 'unavailable' | 'error'

export interface SaveContextResult {
  status: SaveContextStatus
  message?: string
}

export type SaveContextHandler = () => Promise<SaveContextResult> | SaveContextResult

interface SaveContextRegistration {
  token: number
  handler: SaveContextHandler
}

let nextToken = 1
let registrations: SaveContextRegistration[] = []

export function registerSaveContextHandler(handler: SaveContextHandler): () => void {
  const token = nextToken++
  registrations.push({ token, handler })

  return () => {
    registrations = registrations.filter((entry) => entry.token !== token)
  }
}

function getActiveHandler(): SaveContextHandler | null {
  if (registrations.length === 0) return null
  return registrations[registrations.length - 1]?.handler ?? null
}

export async function runSaveContext(): Promise<SaveContextResult> {
  const handler = getActiveHandler()

  if (!handler) {
    return {
      status: 'unavailable',
      message: 'Não há dados editáveis para salvar nesta tela.',
    }
  }

  try {
    const result = await handler()
    if (!result) {
      return { status: 'saved', message: 'Dados salvos com sucesso.' }
    }
    return result
  } catch {
    return {
      status: 'error',
      message: 'Falha ao salvar o conteúdo atual.',
    }
  }
}

export function __resetSaveContextRegistryForTests(): void {
  nextToken = 1
  registrations = []
}
