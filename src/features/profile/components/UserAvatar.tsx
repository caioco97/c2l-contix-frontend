import { Avatar } from '@/components/ui'
import { useBlobUrl } from '@/lib/useBlobUrl'
import type { CurrentUser } from '@/types/auth'
import { profileApi, profileKeys } from '../api'

/** Avatar do usuário logado: a foto de perfil, se houver, senão as iniciais. */
export function UserAvatar({ user, className }: { user: CurrentUser; className?: string }) {
  const src = useBlobUrl(profileKeys.photo(user.id, user.photoVersion), profileApi.photo, !!user.photoVersion)
  return <Avatar name={user.name} src={src} className={className} />
}
