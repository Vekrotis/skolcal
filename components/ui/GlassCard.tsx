import { cn } from '@/utils/cn'

export function GlassCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl shadow-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
