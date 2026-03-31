import { PageHeaderSkeleton, TableSkeleton, Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <TableSkeleton rows={5} />
    </div>
  )
}
