// lib/webhook-logger.ts

import { NextRequest } from 'next/server'

export class WebhookLogger {
  private getTimestamp(): string {
    return new Date().toISOString()
  }

  private formatMessage(context: string, data?: any): string {
    return `[${this.getTimestamp()}] ${context}: ${JSON.stringify(data, null, 2)}`
  }

  public logRequest(req: NextRequest, type: 'verification' | 'webhook'): void {
    const url = new URL(req.url)
    const metadata = {
      type,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      method: req.method,
      headers: Object.fromEntries(req.headers)
    }
    console.log(this.formatMessage(`Instagram ${type} request`, metadata))
  }

  public logError(context: string, error: any): void {
    console.error(this.formatMessage(`Error in ${context}`, {
      message: error?.message || error,
      stack: error?.stack,
      timestamp: this.getTimestamp()
    }))
  }

  public logInfo(context: string, data?: any): void {
    console.log(this.formatMessage(context, data))
  }

  public logWarning(context: string, data?: any): void {
    console.warn(this.formatMessage(context, data))
  }

  public logDebug(context: string, data?: any): void {
    console.debug(this.formatMessage(context, data))
  }
}

export const webhookLogger = new WebhookLogger()