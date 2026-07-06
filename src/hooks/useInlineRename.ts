'use client'

import type { KeyboardEvent } from 'react'

import { useEffect, useRef, useState } from 'react'

type UseInlineRenameProps = {
  value: string
  onCommit?: (value: string) => void | Promise<void>
}

export function useInlineRename({ value, onCommit }: UseInlineRenameProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelEditRef = useRef(false)

  function startEditing() {
    cancelEditRef.current = false
    setIsEditing(true)
  }

  async function commitEdit() {
    if (cancelEditRef.current) {
      cancelEditRef.current = false
      return
    }

    const trimmedValue = draft.trim()
    setIsEditing(false)

    if (trimmedValue.length === 0) {
      setDraft(value)
      return
    }

    setDraft(trimmedValue)

    if (trimmedValue !== value) {
      await onCommit?.(trimmedValue)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      cancelEditRef.current = true
      setIsEditing(false)
      setDraft(value)
      e.currentTarget.blur()
    }
  }

  useEffect(() => {
    if (!isEditing) {
      setDraft(value)
    }
  }, [isEditing, value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  return {
    isEditing,
    draft,
    setDraft,
    inputRef,
    startEditing,
    handleKeyDown,
    handleBlur: commitEdit,
  }
}
