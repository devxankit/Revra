import React from 'react'
import { Link } from 'react-router-dom'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import animationUrl from '../../assets/animations/Error 404.json?url'

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
       
        {/* Lottie Animation */}
        <div className="flex justify-center mb-6">
            <div className="w-64 h-64 md:w-80 md:h-80">
              <DotLottieReact
                src={animationUrl}
                loop
                autoplay
                className="w-full h-full"
              />
            </div>
          </div>
          

        <div className="space-y-4">
          
          <div>
            <button
              onClick={() => window.history.back()}
              className="text-blue-600 hover:text-blue-800 text-base font-medium transition-colors duration-200 hover:underline"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound
