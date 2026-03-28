import { ChannelView } from '@/components/chat/channel-view'

interface ChannelPageProps {
  params: Promise<{ channelId: string }>
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { channelId } = await params
  return <ChannelView channelId={channelId} />
}
