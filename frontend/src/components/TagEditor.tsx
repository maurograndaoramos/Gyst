import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X, Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Tag {
  name: string
  confidence: number
}

interface TagEditorProps {
  tags: Tag[]
  onSave: (tags: string[]) => void
  onCancel: () => void
  isLoading?: boolean
  className?: string
}

const TagEditor: React.FC<TagEditorProps> = ({
  tags,
  onSave,
  onCancel,
  isLoading = false,
  className
}) => {
  const [editedTags, setEditedTags] = useState<string[]>(
    tags.map(tag => tag.name)
  )
  const [newTag, setNewTag] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleAddTag = () => {
    const trimmedTag = newTag.trim().toLowerCase()
    if (trimmedTag && !editedTags.includes(trimmedTag)) {
      setEditedTags(prev => [...prev, trimmedTag])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  const handleSave = () => {
    onSave(editedTags)
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Current Tags */}
      <div className="flex flex-wrap gap-1">
        {editedTags.map((tag, index) => (
          <Badge 
            key={index}
            variant="secondary" 
            className="text-xs px-2 py-1 h-auto pr-1"
          >
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
              disabled={isLoading}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Add New Tag */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1">
          <Input
            ref={inputRef}
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Add tag..."
            className="text-xs h-7"
            disabled={isLoading}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleAddTag}
            disabled={!newTag.trim() || isLoading}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-3 h-3 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default TagEditor
