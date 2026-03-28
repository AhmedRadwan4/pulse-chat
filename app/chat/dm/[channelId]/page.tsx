import { DmView } from '@/components/chat/dm-view'

interface DmPageProps {
  params: Promise<{ channelId: string }>
}

export default async function DmPage({ params }: DmPageProps) {
  const { channelId } = await params
  return <DmView channelId={channelId} />
}
