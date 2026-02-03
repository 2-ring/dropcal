import { PlusCircle, Sidebar as SidebarIcon, CalendarBlank, ArrowSquareOut, Images, Files, Pen, Microphone } from '@phosphor-icons/react'
import type { SessionListItem } from '../types/session'
import type { InputType } from '../types/session'
import logoImage from '../assets/Logo.png'
import wordmarkImage from '../assets/Wordmark.png'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  sessions: SessionListItem[]
  currentSessionId?: string
  onSessionClick: (sessionId: string) => void
  onNewSession: () => void
}

export function Sidebar({
  isOpen,
  onToggle,
  sessions,
  currentSessionId,
  onSessionClick,
  onNewSession,
}: SidebarProps) {
  // Get icon for input type (matches input area icons)
  const getInputIcon = (inputType: InputType) => {
    switch (inputType) {
      case 'image':
        return Images
      case 'document':
        return Files
      case 'audio':
        return Microphone
      case 'text':
        return Pen
      default:
        return Files
    }
  }

  // Group sessions by time period
  const groupSessionsByTime = (sessions: SessionListItem[]) => {
    const now = new Date()
    const groups: { [key: string]: SessionListItem[] } = {
      'Today': [],
      'Yesterday': [],
      '7 Days': [],
      '30 Days': [],
      'Older': [],
    }

    sessions.forEach((session) => {
      const daysDiff = Math.floor(
        (now.getTime() - session.timestamp.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysDiff === 0) {
        groups['Today'].push(session)
      } else if (daysDiff === 1) {
        groups['Yesterday'].push(session)
      } else if (daysDiff <= 7) {
        groups['7 Days'].push(session)
      } else if (daysDiff <= 30) {
        groups['30 Days'].push(session)
      } else {
        groups['Older'].push(session)
      }
    })

    // Remove empty groups
    return Object.entries(groups).filter(([_, sessions]) => sessions.length > 0)
  }

  const groupedSessions = groupSessionsByTime(sessions)

  return (
    <>
      <div className={`fixed top-0 left-0 h-screen bg-[#fafafa] border-r border-[#e5e5e5] flex flex-col transition-[width] duration-300 ease-[ease] z-1000 overflow-hidden ${isOpen ? 'w-70' : 'w-0'}`}>
        <div className="flex items-center justify-between px-4 py-3 min-h-[56px]">
          <div className="flex items-center gap-2.5">
            <img src={wordmarkImage} alt="DropCal" className="h-14 w-auto object-contain my-[-12px_8px_-8px_-12px]" style={{margin: '-12px 8px -8px -12px'}} />
          </div>
          <button className="flex items-center justify-center w-8 h-8 border-none bg-transparent text-[#666] cursor-pointer rounded-md transition-all duration-150 ease-[ease] hover:bg-[#e8e8e8] hover:text-[#333]" onClick={onToggle}>
            <SidebarIcon size={20} weight="regular" />
          </button>
        </div>

        {isOpen && (
          <>
            <button className="flex items-center justify-center gap-2 mx-4 mt-[0.35rem] mb-2 px-[1.125rem] py-2.5 bg-white border border-[#e5e5e5] rounded-2xl text-[#333] text-sm font-medium cursor-pointer transition-all duration-200 ease-[ease] w-[calc(100%-2rem)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:bg-[#fafafa] hover:border-[#d5d5d5] hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)]" onClick={onNewSession}>
              <PlusCircle size={16} weight="bold" />
              <span>New events</span>
            </button>

            <button
              className="flex items-center justify-center gap-2 mx-4 mb-2 px-[1.125rem] py-2.5 bg-white border border-[#e5e5e5] rounded-2xl text-[#333] text-sm font-medium cursor-pointer transition-all duration-200 ease-[ease] w-[calc(100%-2rem)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:bg-[#fafafa] hover:border-[#d5d5d5] hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] [&>:last-child]:opacity-60"
              onClick={() => window.open('https://calendar.google.com', '_blank')?.focus()}
            >
              <CalendarBlank size={16} weight="bold" />
              <span>View calendar</span>
              <ArrowSquareOut size={14} weight="regular" />
            </button>

            <div className="flex-1 overflow-y-auto py-2 px-3 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#d0d0d0] [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-[#b0b0b0]">
              {groupedSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-[#888]">
                  <p className="m-0 text-sm font-medium">No sessions yet</p>
                  <p className="mt-1 m-0 text-xs font-normal text-[#aaa]">Drop files or text to get started</p>
                </div>
              ) : (
                groupedSessions.map(([period, periodSessions]) => (
                  <div key={period} className="mb-3 last:mb-0">
                    <div className="text-[0.6875rem] font-medium text-[#888] capitalize tracking-[0.5px] mb-[0.075rem] px-2.5">{period}</div>
                    {periodSessions.map((session) => {
                      const InputIcon = getInputIcon(session.inputType)
                      return (
                        <div
                          key={session.id}
                          className={`py-2.5 px-2.5 rounded-lg cursor-pointer transition-all duration-150 ease-[ease] mb-0.5 flex items-center justify-between gap-2 ${
                            session.id === currentSessionId ? 'bg-[#e8e8e8] hover:bg-[#e0e0e0]' : 'hover:bg-[#e8e8e8]'
                          } ${session.status === 'error' ? 'opacity-60' : ''}`}
                          onClick={() => onSessionClick(session.id)}
                        >
                          <InputIcon size={16} weight="regular" className={`flex-shrink-0 transition-colors duration-150 ${session.id === currentSessionId ? 'text-[#333]' : 'text-[#666] group-hover:text-[#333]'}`} />
                          <span className="text-sm text-[#333] whitespace-nowrap overflow-hidden text-ellipsis leading-[1.4] flex-1">{session.title}</span>
                          {session.eventCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-[#1170C5] text-white text-[0.6875rem] font-bold rounded-[10px] flex-shrink-0">{session.eventCount}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Logo and dock when sidebar is closed */}
      {!isOpen && (
        <>
          <button className="fixed top-2.5 left-2.5 w-9 h-9 flex items-center justify-center bg-transparent border-none cursor-pointer z-1000 p-0 md:top-2 md:left-2 md:w-8 md:h-8" onClick={onToggle} title="DropCal">
            <img src={logoImage} alt="DropCal" className="w-[26px] h-[26px] object-contain md:w-[22px] md:h-[22px]" />
          </button>
          <div className="fixed top-2.5 left-16 flex flex-row items-center gap-[0.0625rem] p-[0.1875rem] bg-white border border-[#e5e5e5] rounded-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] z-999 md:top-2 md:left-[3.25rem] md:p-[0.15rem] md:gap-[0.05rem]">
            <button className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-[#666] cursor-pointer rounded-[14px] transition-all duration-150 ease-[ease] p-0 hover:bg-[#f5f5f5] hover:text-[#333] md:w-7 md:h-7" onClick={onToggle} title="Expand sidebar">
              <SidebarIcon size={20} weight="regular" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-[#666] cursor-pointer rounded-[14px] transition-all duration-150 ease-[ease] p-0 hover:bg-[#f5f5f5] hover:text-[#333] md:w-7 md:h-7" onClick={onNewSession} title="New events">
              <PlusCircle size={20} weight="regular" />
            </button>
          </div>
        </>
      )}
    </>
  )
}
