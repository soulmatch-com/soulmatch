import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ProfileCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          {/* Avatar Skeleton */}
          <Skeleton className="w-32 h-32 rounded-full mb-4" />

          {/* Name Skeleton */}
          <Skeleton className="h-6 w-32 mb-2" />

          {/* Location Skeleton */}
          <Skeleton className="h-4 w-40 mb-4" />

          {/* Info Rows */}
          <div className="w-full space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Button Skeleton */}
          <Skeleton className="h-10 w-full mt-6" />
        </div>
      </CardContent>
    </Card>
  )
}
