import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  className = '',
  ...props
}) => {
  const baseStyle =
    'px-6 py-2 rounded-3xl font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0D0E12] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'

  const variants = {
    primary:
      'bg-gradient-to-r from-[#8A3FFC] to-[#E02DFF] text-white border-none enabled:hover:shadow-[0_0_25px_rgba(138,63,252,0.8)] enabled:hover:scale-105',
    secondary:
      'bg-transparent border border-white/20 text-white enabled:hover:bg-white/10 enabled:hover:border-white/40 enabled:hover:scale-105',
    danger:
      'bg-[#FF2E63] text-white enabled:hover:bg-red-600 enabled:hover:shadow-[0_0_15px_rgba(255,46,99,0.5)] enabled:hover:scale-105',
  }

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
