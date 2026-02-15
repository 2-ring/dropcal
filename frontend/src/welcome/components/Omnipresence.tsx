import React from 'react'
import './Omnipresence.css'
import './Omnipresence.css'
import {
    GoogleLogo,
    AppleLogo,
    MicrosoftOutlookLogo,
    Envelope,
    ChatCircleText,
    Camera,
    FileText,
    Microphone,
    Link as LinkIcon,
    WhatsappLogo,
    SlackLogo,
    FigmaLogo,
    NotionLogo,
    SpotifyLogo,
    SoundcloudLogo,
    TwitchLogo,
    DiscordLogo
} from '@phosphor-icons/react'

/**
 * ArcIcon places an icon on a specific degree of the massive rotating ring.
 * Rotation places it around the circle.
 */
const ArcIcon = ({ degree, children, color = 'var(--text-primary)' }: { degree: number, children: React.ReactNode, color?: string }) => (
    <div
        className="arc-icon-wrapper"
        style={{ transform: `rotate(${degree}deg)` }}
    >
        <div className="arc-icon" style={{ color }}>
            {children}
        </div>
    </div>
)

export function Omnipresence() {
    // Generate a sequence of icons
    // We cover a full 360 degrees to ensure a continuous stream.

    // Icon definition
    const iconBase = [
        { Icon: Envelope, color: '#EA4335' },
        { Icon: ChatCircleText, color: '#34A853' },
        { Icon: Camera, color: '#FBBC04' },
        { Icon: FileText, color: '#4285F4' },
        { Icon: Microphone, color: '#F97316' },
        { Icon: LinkIcon, color: '#A855F7' },
        { Icon: WhatsappLogo, color: '#25D366' },
        { Icon: SlackLogo, color: '#4A154B' },
        { Icon: FigmaLogo, color: '#F24E1E' },
        { Icon: NotionLogo, color: '#ffffff' },
        { Icon: SpotifyLogo, color: '#1DB954' },
        { Icon: SoundcloudLogo, color: '#FF5500' },
        { Icon: TwitchLogo, color: '#9146FF' },
        { Icon: DiscordLogo, color: '#5865F2' },
    ]

    // Create a full ring of icons. 
    // Ring circumference ~9424px. Icon width ~64px + 16px gap = 80px.
    // Need approx 118-120 icons to fill the ring edge-to-edge.
    // 360 degrees / 120 icons = 3 degrees per icon.

    const fullRingIcons = Array.from({ length: 120 }, (_, i) => {
        const item = iconBase[i % iconBase.length]
        return {
            ...item,
            degree: i * 3 // 3 degrees separation for dense flow
        }
    })

    return (
        <section className="omnipresence-section">
            <div className="floating-icons-container">
                <div className="arc-ring">
                    {fullRingIcons.map((item, i) => (
                        <ArcIcon key={i} degree={item.degree} color={item.color}>
                            <item.Icon weight="duotone" />
                        </ArcIcon>
                    ))}
                </div>
            </div>

            <div className="omnipresence-container">
                {/* Left Side: Content */}
                <div className="omnipresence-content">
                    <div className="platform-chips">
                        <div className="platform-chip">
                            <GoogleLogo weight="duotone" className="platform-icon" />
                            Google Calendar
                        </div>
                        <div className="platform-chip">
                            <AppleLogo weight="duotone" className="platform-icon" />
                            Apple Calendar
                        </div>
                        <div className="platform-chip">
                            <MicrosoftOutlookLogo weight="duotone" className="platform-icon" />
                            Outlook
                        </div>
                    </div>

                    <h2 className="omnipresence-title">
                        Schedule from anywhere,<br />
                        on any device
                    </h2>

                    <p className="omnipresence-subtext">
                        DropCal lives wherever scheduling information exists. Share a screenshot, forward an email, text a photo, paste a link. Your preferences sync across every surface.
                    </p>

                    <button className="omnipresence-cta">
                        See how it works
                    </button>
                </div>

                {/* Right Side: Visual (Phone) */}
                <div className="omnipresence-visual">
                    <div className="phone-mockup">
                        <div className="phone-notch"></div>
                        <div className="phone-screen">
                            <div className="app-screen-placeholder">
                                <div className="app-header-ph"></div>
                                <div style={{ marginTop: '20px' }}></div>
                                <div className="app-card-ph"></div>
                                <div className="app-card-ph"></div>
                                <div className="app-card-ph"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
