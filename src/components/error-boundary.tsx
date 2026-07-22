'use client'

import { Component, ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallbackTitle?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-2 border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">{this.props.fallbackTitle ?? 'Ошибка загрузки раздела'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Произошла ошибка при отображении этого раздела</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4 max-w-lg">
              {this.state.error?.message ?? 'Неизвестная ошибка. Попробуйте перезагрузить раздел.'}
            </p>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={this.handleRetry}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      )
    }
    return this.props.children
  }
}
