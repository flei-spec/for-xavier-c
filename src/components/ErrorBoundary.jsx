import { Component } from 'react'

// React Error Boundary — must be a class component (no hooks equivalent).
// Catches any rendering exception in the subtree and shows a soft recovery
// screen instead of a blank white page.

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { crashed: false }
  }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] caught:', error?.message, info?.componentStack?.slice(0, 200))
  }

  render() {
    if (!this.state.crashed) return this.props.children

    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.2rem',
        background: 'var(--bg-deep, #0d0d14)',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '1.4rem', opacity: 0.4 }}>✦</p>
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1rem',
          color: 'rgba(255,255,255,0.55)',
          fontStyle: 'italic',
        }}>
          电台遇到了一点小问题
        </p>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>
          刷新一下，应该就好了
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 1.6rem',
            border: '1px solid rgba(244,161,176,0.2)',
            borderRadius: '20px',
            background: 'none',
            color: 'rgba(244,161,176,0.6)',
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          刷新页面
        </button>
      </div>
    )
  }
}
