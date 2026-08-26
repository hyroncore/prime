import { cn } from '@/lib/utils'

const AVATAR_PALETTES = [
  ['#3B82F6', '#1E40AF', '#DBEAFE'],
  ['#10B981', '#047857', '#D1FAE5'],
  ['#F59E0B', '#B45309', '#FEF3C7'],
  ['#EF4444', '#991B1B', '#FEE2E2'],
  ['#8B5CF6', '#5B21B6', '#F3E8FF'],
  ['#EC4899', '#9D174D', '#FCE7F3'],
  ['#06B6D4', '#164E63', '#CFFAFE'],
  ['#84CC16', '#3F6212', '#F0FDF4'],
]

const SHAPE_TYPES = ['circle', 'square', 'triangle', 'hexagon', 'star'] as const

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function getAvatarConfig(username: string) {
  const hash = hashString(username)
  const palette = AVATAR_PALETTES[hash % AVATAR_PALETTES.length]
  const shapeType = SHAPE_TYPES[hash % SHAPE_TYPES.length]
  const complexity = (hash % 3) + 1
  const rotation = (hash % 4) * 90
  return { palette, shapeType, complexity, rotation }
}

function ShapeComponent({ shapeType, palette, complexity, rotation, size }: { 
  shapeType: typeof SHAPE_TYPES[number]
  palette: string[]
  complexity: number
  rotation: number
  size: number
}) {
  const primaryColor = palette[0]
  const secondaryColor = palette[1]
  const tertiaryColor = palette[2]

  const style = {
    width: size,
    height: size,
    transform: `rotate(${rotation}deg)`,
  } as React.CSSProperties

  const drawCircle = () => (
    <svg viewBox="0 0 100 100" width={size} height={size} style={style}>
      <circle cx="50" cy="50" r="45" fill={primaryColor} />
      {complexity > 1 && <circle cx="50" cy="50" r="30" fill={secondaryColor} />}
      {complexity > 2 && <circle cx="50" cy="50" r="15" fill={tertiaryColor} />}
    </svg>
  )

  const drawSquare = () => (
    <svg viewBox="0 0 100 100" width={size} height={size} style={style}>
      <rect x="5" y="5" width="90" height="90" rx="8" fill={primaryColor} />
      {complexity > 1 && <rect x="20" y="20" width="60" height="60" rx="4" fill={secondaryColor} />}
      {complexity > 2 && <rect x="35" y="35" width="30" height="30" rx="2" fill={tertiaryColor} />}
    </svg>
  )

  const drawTriangle = () => (
    <svg viewBox="0 0 100 100" width={size} height={size} style={style}>
      <polygon points="50,5 95,95 5,95" fill={primaryColor} />
      {complexity > 1 && <polygon points="50,20 85,80 15,80" fill={secondaryColor} />}
      {complexity > 2 && <polygon points="50,35 70,70 30,70" fill={tertiaryColor} />}
    </svg>
  )

  const drawHexagon = () => (
    <svg viewBox="0 0 100 100" width={size} height={size} style={style}>
      <polygon points="50,5 95,30 95,70 50,95 5,70 5,30" fill={primaryColor} />
      {complexity > 1 && <polygon points="50,20 80,37.5 80,62.5 50,80 20,62.5 20,37.5" fill={secondaryColor} />}
      {complexity > 2 && <polygon points="50,35 70,45 70,55 50,65 30,55 30,45" fill={tertiaryColor} />}
    </svg>
  )

  const drawStar = () => (
    <svg viewBox="0 0 100 100" width={size} height={size} style={style}>
      <polygon points="50,5 61,35 92,38 68,57 75,88 50,73 25,88 32,57 8,38 39,35" fill={primaryColor} />
      {complexity > 1 && <polygon points="50,20 58,42 82,44 65,57 70,78 50,65 30,78 38,57 18,42 42,42" fill={secondaryColor} />}
      {complexity > 2 && <polygon points="50,30 56,46 74,48 60,57 66,72 50,64 34,72 30,57 26,46 44,46" fill={tertiaryColor} />}
    </svg>
  )

  switch (shapeType) {
    case 'circle':
      return drawCircle()
    case 'square':
      return drawSquare()
    case 'triangle':
      return drawTriangle()
    case 'hexagon':
      return drawHexagon()
    case 'star':
      return drawStar()
    default:
      return drawCircle()
  }
}

export interface MetricAvatarProps {
  username: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | number
  className?: string
  showInitials?: boolean
}

export function MetricAvatar({ username, size = 'md', className, showInitials = false }: MetricAvatarProps) {
  const sizeMap = { sm: 32, md: 40, lg: 48, xl: 64 }
  const sizeValue = typeof size === 'number' ? size : sizeMap[size]

  const { palette, shapeType, complexity, rotation } = getAvatarConfig(username)
  const initials = username.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'U'

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <ShapeComponent
        shapeType={shapeType}
        palette={palette}
        complexity={complexity}
        rotation={rotation}
        size={sizeValue}
      />
      {showInitials && (
        <span className="absolute text-white text-sm font-bold pointer-events-none select-none">
          {initials}
        </span>
      )}
    </div>
  )
}