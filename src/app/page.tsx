import { Suspense } from 'react';
import VideoFeed from '@/components/VideoFeed';

export default function Home() {
  return (
    <Suspense>
      <VideoFeed />
    </Suspense>
  );
}
