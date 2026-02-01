/**
 * MAILGUARD LOGO COMPONENT
 * Professional shield + envelope logo with gradient
 */

function Logo({ size = 'md', showText = true, className = '' }) {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg' },
    md: { icon: 'w-10 h-10', text: 'text-xl' },
    lg: { icon: 'w-16 h-16', text: 'text-3xl' },
    xl: { icon: 'w-20 h-20', text: 'text-4xl' }
  }

  const currentSize = sizes[size] || sizes.md

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Shield + Envelope Icon */}
      <div className={`relative ${currentSize.icon}`}>
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shield Background with Gradient */}
          <defs>
            <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="envelopeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
          </defs>
          
          {/* Shield Shape */}
          <path
            d="M32 4L10 12V28C10 42 18 52 32 60C46 52 54 42 54 28V12L32 4Z"
            fill="url(#shieldGradient)"
            opacity="0.9"
          />
          
          {/* Envelope */}
          <g transform="translate(18, 22)">
            {/* Envelope body */}
            <rect
              x="0"
              y="2"
              width="28"
              height="18"
              rx="2"
              fill="white"
              opacity="0.95"
            />
            
            {/* Envelope flap */}
            <path
              d="M0 4L14 13L28 4"
              stroke="url(#envelopeGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            
            {/* Checkmark */}
            <path
              d="M8 11L12 15L20 7"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        </svg>
      </div>

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent ${currentSize.text}`}>
            Mailguard
          </span>
          <span className="text-xs text-gray-400 font-medium tracking-wide">
            AI Phishing Shield
          </span>
        </div>
      )}
    </div>
  )
}

export default Logo
