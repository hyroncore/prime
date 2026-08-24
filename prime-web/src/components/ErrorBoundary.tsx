import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div dir="rtl" className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6">
            <h1 className="mb-2 text-sm font-black text-red-800">حدث خطأ غير متوقع</h1>
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-red-700" dir="ltr">
              {this.state.error.message}
            </pre>
            <Button
              variant="destructive"
              onClick={() => location.reload()}
              className="mt-4 text-xs font-bold"
            >
              إعادة تحميل
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}