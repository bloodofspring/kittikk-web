/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      IS_ANALYZE_MODE_ON: '1' | '0'
      IS_REACT_STRICT_MODE_ON: '1' | '0'
      NEXT_PUBLIC_APP_ENV: 'prod' | 'stage' | 'dev'
      NEXT_PUBLIC_IS_API_MOCKING_ENABLED: '1' | '0'
      SENTRY_SERVER_DSN: string
    }
  }

  interface Window {
    smartCaptcha: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string
          callback?: (token: string) => void
          hl?: 'ru' | 'en' | 'be' | 'kk' | 'tt' | 'uk' | 'uz' | 'tr'
          invisible?: boolean
          test?: boolean
        },
      ) => number
      execute: (widgetId?: number) => void
      getResponse: (widgetId?: number) => string
      reset: (widgetId?: number) => void
      subscribe: (
        widgetId?: number,
        event: string,
        callback: (...params: any[]) => void,
      ) => () => void
    }
  }
}

export {}
