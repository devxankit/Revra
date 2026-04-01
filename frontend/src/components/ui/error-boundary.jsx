import React from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import animationUrl from '../../assets/animations/505 Error.json?url'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
          <div className="max-w-2xl w-full text-center">
            
            {/* Lottie Animation */}
            <div className="flex justify-center mb-8">
              <div className="w-64 h-64 md:w-80 md:h-80">
                <DotLottieReact
                  src={animationUrl}
                  loop
                  autoplay
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex justify-center">
              <button
                onClick={() => window.location.reload()}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300"
              >
                <svg 
                  className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
