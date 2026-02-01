import { useState } from 'react'
import { CalendarPlus, PlusCircle, Sidebar as SidebarIcon, CalendarBlank, ArrowSquareOut } from '@phosphor-icons/react'
import './Sidebar.css'
import logoImage from '../assets/Logo.png'
import wordmarkImage from '../assets/Wordmark.png'

interface ChatEntry {
  id: string
  title: string
  timestamp: Date
}

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [chats] = useState<ChatEntry[]>([
    {
      id: '1',
      title: 'Meeting with team tomorrow at 2pm',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    },
    {
      id: '2',
      title: 'Dentist appointment next week',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    },
    {
      id: '3',
      title: 'Conference call schedule',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35), // 35 days ago
    },
  ])

  // Group chats by time period
  const groupChatsByTime = (chats: ChatEntry[]) => {
    const now = new Date()
    const groups: { [key: string]: ChatEntry[] } = {
      'Today': [],
      'Yesterday': [],
      '7 Days': [],
      '30 Days': [],
      'Older': [],
    }

    chats.forEach(chat => {
      const daysDiff = Math.floor((now.getTime() - chat.timestamp.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff === 0) {
        groups['Today'].push(chat)
      } else if (daysDiff === 1) {
        groups['Yesterday'].push(chat)
      } else if (daysDiff <= 7) {
        groups['7 Days'].push(chat)
      } else if (daysDiff <= 30) {
        groups['30 Days'].push(chat)
      } else {
        groups['Older'].push(chat)
      }
    })

    // Remove empty groups
    return Object.entries(groups).filter(([_, chats]) => chats.length > 0)
  }

  const groupedChats = groupChatsByTime(chats)

  return (
    <>
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src={wordmarkImage} alt="DropCal" className="wordmark-logo" />
          </div>
          <button className="sidebar-toggle" onClick={onToggle}>
            <SidebarIcon size={20} weight="regular" />
          </button>
        </div>

        {isOpen && (
          <>
            <button className="new-chat-button">
              <PlusCircle size={16} weight="bold" />
              <span>New events</span>
            </button>

            <button
              className="view-calendar-button"
              onClick={() => window.open('https://calendar.google.com', '_blank')?.focus()}
            >
              <CalendarBlank size={16} weight="bold" />
              <span>View calendar</span>
              <ArrowSquareOut size={14} weight="regular" />
            </button>

            <div className="chat-history">
              {groupedChats.map(([period, periodChats]) => (
                <div key={period} className="chat-group">
                  <div className="chat-group-label">{period}</div>
                  {periodChats.map(chat => (
                    <div key={chat.id} className="chat-entry">
                      <span className="chat-entry-title">{chat.title}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Logo and dock when sidebar is closed */}
      {!isOpen && (
        <>
          <button className="floating-logo" onClick={onToggle} title="DropCal">
            <img src={logoImage} alt="DropCal" className="floating-logo-icon" />
          </button>
          <div className="sidebar-dock">
            <button className="dock-icon-button" onClick={onToggle} title="Expand sidebar">
              <SidebarIcon size={20} weight="regular" />
            </button>
            <button className="dock-icon-button" title="New events">
              <PlusCircle size={20} weight="regular" />
            </button>
          </div>
        </>
      )}
    </>
  )
}
