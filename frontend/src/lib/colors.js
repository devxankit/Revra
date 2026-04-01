// Centralized Color Theme Configuration
// Based on the provided color palette

export const colors = {
  // Primary color palette
  'light-sea-green': '#07beb8',
  'robin-egg-blue': '#3dccc7',
  'tiffany-blue': '#68d8d6',
  'celeste': '#9ceaefff',
  'celeste-2': '#c4fff9',
  
  // HSL values for better color manipulation
  'light-sea-green-hsl': '178, 93%, 39%',
  'robin-egg-blue-hsl': '178, 58%, 52%',
  'tiffany-blue-hsl': '179, 59%, 63%',
  'celeste-hsl': '184, 72%, 77%',
  'celeste-2-hsl': '174, 100%, 88%',
  
  // RGB values
  'light-sea-green-rgb': '7, 190, 184',
  'robin-egg-blue-rgb': '61, 204, 199',
  'tiffany-blue-rgb': '104, 216, 214',
  'celeste-rgb': '156, 234, 239',
  'celeste-2-rgb': '196, 255, 249',
}

// Gradient configurations
export const gradients = {
  'primary': 'linear-gradient(135deg, #07beb8, #3dccc7)',
  'secondary': 'linear-gradient(135deg, #3dccc7, #68d8d6)',
  'tertiary': 'linear-gradient(135deg, #68d8d6, #9ceaefff)',
  'quaternary': 'linear-gradient(135deg, #9ceaefff, #c4fff9)',
  'full': 'linear-gradient(135deg, #07beb8, #3dccc7, #68d8d6, #9ceaefff, #c4fff9)',
  
  // Directional gradients
  'top': 'linear-gradient(0deg, #07beb8, #3dccc7, #68d8d6, #9ceaefff, #c4fff9)',
  'right': 'linear-gradient(90deg, #07beb8, #3dccc7, #68d8d6, #9ceaefff, #c4fff9)',
  'bottom': 'linear-gradient(180deg, #07beb8, #3dccc7, #68d8d6, #9ceaefff, #c4fff9)',
  'left': 'linear-gradient(270deg, #07beb8, #3dccc7, #68d8d6, #9ceaefff, #c4fff9)',
  'top-right': 'linear-gradient(45deg, #07beb8, #3dccc7, #68d8d6, #9ceaefff, #c4fff9)',
  'bottom-right': 'linear-gradient(135deg, #07beb8, #3dccc7, #68d8d6, #9ceaefff, #c4fff9)',
  'top-left': 'linear-gradient(225deg, #07beb8, #3dccc7, #68d8d6, #9ceaefff, #c4fff9)',
  'bottom-left': 'linear-gradient(315deg, #07beb8, #3dccc7, #68d8d6, #9ceaefff, #c4fff9)',
  'radial': 'radial-gradient(#07beb8, #3dccc7, #68d8d6, #9ceaefff, #c4fff9)',
}

// Color variants for different use cases
export const colorVariants = {
  // Primary brand colors
  primary: {
    50: '#c4fff9',
    100: '#9ceaefff',
    200: '#68d8d6',
    300: '#3dccc7',
    400: '#07beb8',
    500: '#07beb8', // Main brand color
    600: '#06a8a3',
    700: '#05928e',
    800: '#047c79',
    900: '#036664',
  },
  
  // Secondary colors for accents
  secondary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
  
  // Supporting colors for tiles and cards
  accent: {
    teal: '#07beb8',
    'robin-egg': '#3dccc7',
    tiffany: '#68d8d6',
    celeste: '#9ceaefff',
    'celeste-light': '#c4fff9',
  }
}

// Utility functions for color manipulation
export const colorUtils = {
  // Get color with opacity
  withOpacity: (color, opacity) => {
    const rgb = colors[`${color}-rgb`]
    return `rgba(${rgb}, ${opacity})`
  },
  
  // Get HSL color
  getHsl: (color) => {
    return `hsl(${colors[`${color}-hsl`]})`
  },
  
  // Get RGB color
  getRgb: (color) => {
    return `rgb(${colors[`${color}-rgb`]})`
  },
  
  // Get gradient
  getGradient: (gradientName) => {
    return gradients[gradientName] || gradients.primary
  }
}

export default colors
