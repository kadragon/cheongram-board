// Trace: SPEC-homepage-modernization-1, TASK-homepage-004

import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";

export function SkeletonCard() {
  return (
    <Card className="flex flex-col relative animate-pulse">
      <CardHeader className="pb-2">
        <div className="h-6 bg-muted rounded w-3/4"></div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="rounded-md bg-muted h-48 w-full skeleton"></div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="h-5 bg-muted rounded w-20"></div>
        <div className="h-5 bg-muted rounded w-16"></div>
      </CardFooter>
    </Card>
  );
}
