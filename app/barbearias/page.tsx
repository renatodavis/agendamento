import type { Metadata } from 'next'
import SegmentPage from '@/components/marketing/SegmentPage'
import { getSegment } from '@/lib/segments'
import { openGraphFor } from '@/lib/site'

const segment = getSegment('barbearias')!

export const metadata: Metadata = {
  title: segment.title,
  description: segment.description,
  alternates: { canonical: `/${segment.slug}` },
  openGraph: openGraphFor(`/${segment.slug}`, segment.title, segment.description),
}

export default function Page() {
  return <SegmentPage segment={segment} />
}
