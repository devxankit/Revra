import React from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import loadingAnimation from '../../assets/animations/Loading Files.json?url'

const Loading = ({ size = 'xlarge', className = '' }) => {
  // Size configurations
  const sizeConfig = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
    xlarge: 'w-48 h-48'
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={sizeConfig[size]}>
        <DotLottieReact
          src={loadingAnimation}
          loop
          autoplay
          className="w-full h-full"
        />
      </div>
    </div>
  )
}

export default Loading
