export interface WebhookPayload {
  entry: Array<{
    id: string
    messaging?: Array<{
      sender: { id: string }
      recipient: { id: string }
      message: { text: string }
    }>
    changes?: Array<{
      field: string
      value: {
        id: string
        text: string
        media: { id: string }
        from: { id: string }
      }
    }>
  }>
}

export class WebhookValidator {
  private validateMessaging(messaging: any): boolean {
    if (!Array.isArray(messaging)) return false
    if (messaging.length === 0) return true

    return messaging.every(msg => 
      msg?.sender?.id &&
      msg?.recipient?.id &&
      typeof msg?.message?.text === 'string'
    )
  }

  private validateChanges(changes: any): boolean {
    if (!Array.isArray(changes)) return false
    if (changes.length === 0) return true

    return changes.every(change => 
      typeof change?.field === 'string' &&
      change?.value?.id &&
      (change.field !== 'comments' || 
        (change.value?.media?.id && 
         change.value?.from?.id))
    )
  }

  public validatePayload(payload: any): payload is WebhookPayload {
    try {
      if (!payload || typeof payload !== 'object') {
        return false
      }

      if (!Array.isArray(payload.entry) || payload.entry.length === 0) {
        return false
      }

      return payload.entry.every((entry: { id: any; messaging: any; changes: any }) => {
        if (typeof entry.id !== 'string') {
          return false
        }

        if (entry.messaging && !this.validateMessaging(entry.messaging)) {
          return false
        }

        if (entry.changes && !this.validateChanges(entry.changes)) {
          return false
        }

        return true
      })
    } catch (error) {
      console.error('Validation error:', error)
      return false
    }
  }
}

export const webhookValidator = new WebhookValidator()