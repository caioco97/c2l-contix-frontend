import { useState } from 'react'
import { ChevronRight, Folder, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { DocumentFolder } from '@/types/domain'

interface FolderTreeProps {
  folders: DocumentFolder[]
  selectedId: string | undefined
  onSelect: (folder: DocumentFolder) => void
}

export function FolderTree({ folders, selectedId, onSelect }: FolderTreeProps) {
  return (
    <ul role="tree" aria-label="Pastas" className="space-y-0.5">
      {folders.map((f) => (
        <FolderNode key={f.id} folder={f} depth={0} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </ul>
  )
}

function FolderNode({
  folder,
  depth,
  selectedId,
  onSelect,
}: {
  folder: DocumentFolder
  depth: number
  selectedId: string | undefined
  onSelect: (folder: DocumentFolder) => void
}) {
  const hasChildren = !!folder.children?.length
  const containsSelected = !!folder.children?.some((c) => c.id === selectedId)
  const [expanded, setExpanded] = useState(containsSelected)
  const selected = folder.id === selectedId
  const Icon = selected ? FolderOpen : Folder

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={selected}>
      <div
        className={cn(
          'group flex items-center rounded-lg pr-2 transition-colors',
          selected ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-50',
        )}
        style={{ paddingLeft: depth * 16 }}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={cn('flex h-9 w-7 items-center justify-center text-slate-400', !hasChildren && 'invisible')}
          aria-label={expanded ? `Recolher ${folder.name}` : `Expandir ${folder.name}`}
          tabIndex={hasChildren ? 0 : -1}
        >
          <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
        </button>
        <button
          type="button"
          onClick={() => onSelect(folder)}
          className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left text-sm"
        >
          <Icon className={cn('h-4.5 w-4.5 shrink-0', selected ? 'text-brand-600' : 'text-slate-400')} />
          <span className={cn('truncate', selected && 'font-semibold')}>{folder.name}</span>
          {folder.unreadCount > 0 && (
            <span className="ml-auto rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">
              {folder.unreadCount}
            </span>
          )}
        </button>
      </div>
      {hasChildren && expanded && (
        <ul role="group" className="space-y-0.5">
          {folder.children!.map((c) => (
            <FolderNode key={c.id} folder={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  )
}
