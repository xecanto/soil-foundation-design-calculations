import Image from 'next/image'
import { cn } from '@/lib/utils'

interface GeofoundLogoProps {
  className?: string
  compact?: boolean
}

export default function GeofoundLogo({
  className,
  compact = false,
}: GeofoundLogoProps) {
  return (
    <div className={cn('relative', compact ? 'w-[170px] sm:w-[190px]' : 'w-[250px] sm:w-[300px]', className)}>
      <Image
        src="/logo.svg"
        alt="Geofound"
        width={550}
        height={190}
        priority
        className="h-auto w-full"
      />
    </div>
  )
}