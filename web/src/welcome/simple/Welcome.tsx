import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
    List, X, Mailbox, FingerprintSimple, Flask,
    Envelope, ChatCircleText, Camera, FileText, Microphone,
    Link as LinkIcon, WhatsappLogo, SlackLogo, NotionLogo,
    TelegramLogo, LinkedinLogo, DiscordLogo, Globe, Image,
    EyesIcon, ArrowSquareOut, ArrowLeft,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { FlowPath } from '../full/components/FlowPath'
import { CTAButton } from '../full/components/CTAButton'
import { PageDeck, type PageDeckHandle, type PageRender } from './PageDeck'
import { useAnimatedPosition } from './animation'
import { useAuth } from '../../auth/AuthContext'
import { MenuButton } from '../../menu/MenuButton'
import phoneDemoLight from '../../assets/demo/phone-light.png'
import './Welcome.css'

function GoogleLogo({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
            <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
            <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
            <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.001-.001 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
        </svg>
    )
}

function AppleLogo({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 18 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.4556 7.15814C16.7692 7.5784 16.2006 8.16594 15.8031 8.86579C15.4055 9.56563 15.1921 10.3549 15.1826 11.1597C15.1853 12.0655 15.4537 12.9506 15.9545 13.7054C16.4553 14.4602 17.1665 15.0515 18 15.4061C17.6714 16.4664 17.185 17.4712 16.5572 18.3868C15.659 19.6798 14.7198 20.9727 13.2908 20.9727C11.8617 20.9727 11.4942 20.1425 9.84729 20.1425C8.24129 20.1425 7.66959 21 6.36297 21C5.05635 21 4.14455 19.8022 3.09649 18.3323C1.71208 16.2732 0.951222 13.8583 0.905212 11.3774C0.905212 7.29427 3.55931 5.13028 6.17241 5.13028C7.56069 5.13028 8.71769 6.04208 9.58869 6.04208C10.419 6.04208 11.712 5.07572 13.2908 5.07572C14.1025 5.05478 14.9069 5.23375 15.6332 5.59689C16.3595 5.96003 16.9853 6.49619 17.4556 7.15814ZM12.5422 3.34726C13.2382 2.52858 13.6321 1.49589 13.6583 0.421702C13.6595 0.280092 13.6458 0.13875 13.6175 0C12.422 0.116777 11.3165 0.686551 10.5278 1.59245C9.82519 2.37851 9.41639 3.38362 9.37089 4.43697C9.37139 4.56507 9.38509 4.69278 9.41179 4.81808C9.50599 4.8359 9.60169 4.84503 9.69759 4.84536C10.2485 4.80152 10.7848 4.64611 11.2738 4.38858C11.7629 4.13104 12.1944 3.77676 12.5422 3.34726Z" fill="currentColor"/>
        </svg>
    )
}

function MicrosoftLogo({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.12427 9.02804H0.0947876V0H9.12427V9.02804Z" fill="#F1511B"/>
            <path d="M19.0951 9.02804H10.0648V0H19.0943V9.02804H19.0951Z" fill="#80CC28"/>
            <path d="M9.12427 19.0012H0.0947876V9.97314H9.12427V19.0012Z" fill="#00ADEF"/>
            <path d="M19.0951 19.0012H10.0648V9.97314H19.0943V19.0012H19.0951Z" fill="#FBBC09"/>
        </svg>
    )
}

// Provider icons used by the embedded auth state.
const AuthGoogleIcon = (
    <svg viewBox="0 0 48 48" width="20" height="20">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
)
const AuthMicrosoftIcon = (
    <svg viewBox="0 0 48 48" width="20" height="20">
        <path fill="#f25022" d="M0 0h23v23H0z" />
        <path fill="#00a4ef" d="M25 0h23v23H25z" />
        <path fill="#7fba00" d="M0 25h23v23H0z" />
        <path fill="#ffb900" d="M25 25h23v23H25z" />
    </svg>
)
const AuthAppleIcon = (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
)

export function Welcome() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, loading: authLoading, signIn } = useAuth()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    /** Scroll list index — fully owned by the PageDeck. We mirror it here for the page dots. */
    const [listIndex, setListIndex] = useState(0)
    const deckRef = useRef<PageDeckHandle>(null)

    /** Two state variables. That's it. */
    const authOpen = location.pathname === '/auth'

    /**
     * Single shell-level animated value: 0 = deck active, 1 = auth active.
     * Same tween primitive that PageDeck uses internally for slide-to-slide.
     * The active deck page receives this as `outerProgress` so its own intrinsic
     * exit animation plays during the deck↔auth transition.
     */
    const shellProgress = useAnimatedPosition(authOpen ? 1 : 0, { duration: 420 })

    // If the user signs in successfully while on /auth, send them into the app.
    useEffect(() => {
        if (authOpen && !authLoading && user) {
            navigate('/app', { replace: true })
        }
    }, [authOpen, authLoading, user, navigate])

    const goToPage = (index: number) => deckRef.current?.goToPage(index)

    const iconSource = [
        Envelope, ChatCircleText, Camera, FileText, Microphone, LinkIcon,
        WhatsappLogo, SlackLogo, Image, NotionLogo,
        TelegramLogo, LinkedinLogo, Globe, DiscordLogo,
    ]

    const iconNodes = iconSource.map((Icon, i) => (
        <div key={i} className="omnipresence-icon-card">
            <Icon weight="duotone" style={{ color: 'var(--text-secondary)' }} />
        </div>
    ))

    const pages: PageRender[] = [
        (progress) => {
            // Forward-exit progress: 0 on page 1, 1 on page 2.
            const exitT = Math.max(0, Math.min(1, progress))

            // Plain shrink + fade for the whole text block. No rotation.
            const blockStyle = {
                transform: `scale(${1 - exitT * 0.2})`,
                transformOrigin: 'center center' as const,
                opacity: Math.max(0, 1 - exitT * 1.4),
                willChange: 'transform, opacity',
            }

            return (
            <section className="welcome-page omnipresence-page">
                <FlowPath
                    icons={iconNodes}
                    iconSize={80}
                    gap={20}
                    path="M -400 650 C 0 950, 1000 50, 2000 350"
                    pathLength={2600}
                    duration={45}
                    progress={exitT}
                />
                <div className="omnipresence-container">
                    <div className="omnipresence-content">
                        <div style={blockStyle}>
                            <div className="platform-chips">
                                <div className="platform-chip">
                                    <GoogleLogo className="platform-icon" /> Google
                                </div>
                                <div className="platform-chip">
                                    <AppleLogo className="platform-icon" /> Apple
                                </div>
                                <div className="platform-chip">
                                    <MicrosoftLogo className="platform-icon" /> Microsoft
                                </div>
                            </div>
                            <h2 className="omnipresence-title">Never schedule<br />manually again</h2>
                            <p className="omnipresence-subtext">
                            Class syllabus? Flyer? Instagram story? Email? Random PDF a professor sent at midnight? Drop it in from anywhere and forget
it ever existed. DropCal schedules it the way you would: your colors, your shorthand, your conventions.                        </p>
                            <CTAButton
                                text="See how it works"
                                to="/auth"
                                backgroundColor="#ffffff"
                                textColor="var(--primary-color)"
                                className="see-how-cta-desktop"
                                iconLeft={<EyesIcon size={22} weight="duotone" />}
                                iconRight={<ArrowSquareOut size={20} weight="duotone" />}
                            />
                        </div>
                    </div>
                    <div
                        className="omnipresence-visual"
                        style={{
                            transform: `translateY(${-exitT * 300}px)`,
                            opacity: Math.max(0, 1 - exitT * 1.4),
                            willChange: 'transform, opacity',
                        }}
                    >
                        <div className="phone-mockup">
                            <div className="phone-notch"></div>
                            <div className="phone-screen">
                                <img
                                    src={phoneDemoLight}
                                    alt="DropCal app demo"
                                    className="phone-demo-img"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <CTAButton
                    text="See how it works"
                    to="/auth"
                    backgroundColor="#ffffff"
                    textColor="var(--primary-color)"
                    className="see-how-cta-mobile"
                    iconLeft={<EyesIcon size={22} weight="duotone" />}
                    iconRight={<ArrowSquareOut size={20} weight="duotone" />}
                />
            </section>
            )
        },
        () => <section className="welcome-page blank-page" />,
    ]

    const PAGE_COUNT = pages.length

    // Auth panel. Lives outside the deck. Uses the same animation primitive
    // (shellProgress) but is its own visual layer with its own intrinsic
    // entrance/exit. progress = 0 when active, 1 when fully exited.
    const authProgress = 1 - shellProgress
    const authBlockStyle = {
        transform: `scale(${1 - authProgress * 0.15})`,
        transformOrigin: 'center center' as const,
        opacity: Math.max(0, 1 - authProgress * 1.4),
        willChange: 'transform, opacity',
        pointerEvents: shellProgress > 0.5 ? 'auto' as const : 'none' as const,
    }

    return (
        <div className="welcome-simple">
            {/* Nav — always docked */}
            <nav className="welcome-nav">
                <div className="nav-container">
                    <div className="nav-logo" onClick={() => navigate('/welcome')}>
                        <Logo size={32} />
                        <span className="display-text nav-wordmark-text">dropcal</span>
                    </div>
                    <div className="nav-cta-container">
                        <a href="mailto:lucas@dropcal.ai" className="nav-secondary-link">
                            <Mailbox size={20} weight="duotone" />
                            Contact
                        </a>
                        <button onClick={() => navigate('/auth')} className="nav-secondary-link">
                            <FingerprintSimple size={20} weight="duotone" />
                            Log In
                        </button>
                        <CTAButton
                            text="Join Beta"
                            iconLeft={<Flask size={20} weight="duotone" />}
                            to="/auth"
                            backgroundColor="var(--primary)"
                            textColor="white"
                            className="nav-cta-button"
                        />
                        <button
                            className="mobile-menu-toggle"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <X size={24} weight="duotone" /> : <List size={24} weight="duotone" />}
                        </button>
                    </div>
                </div>
            </nav>

            <div className={`mobile-drawer-backdrop ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />
            <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="mobile-drawer-handle" />
                <div className="mobile-drawer-links">
                    <a href="mailto:lucas@dropcal.ai" onClick={() => setMobileMenuOpen(false)}>
                        <Mailbox size={20} weight="duotone" />
                        Contact
                    </a>
                    <button onClick={() => { setMobileMenuOpen(false); navigate('/auth') }}>
                        <FingerprintSimple size={20} weight="duotone" />
                        Log In
                    </button>
                </div>
                <CTAButton
                    text="Join Beta"
                    iconLeft={<Flask size={20} weight="duotone" />}
                    to="/auth"
                    backgroundColor="var(--primary)"
                    textColor="white"
                    className="drawer-cta-button"
                />
            </div>

            {/* Rounded frame — fixed border. The deck owns ALL transitions
                (page-to-page, page-to-auth, auth-to-page) using the same exit/enter
                machinery. Each page defines its own animation via `progress`. */}
            <div className="welcome-frame">
                {/* Back button — fades in only on the auth page. */}
                <button
                    type="button"
                    className={`welcome-auth-back ${authOpen ? '' : 'hidden'}`}
                    onClick={() => navigate('/welcome')}
                    aria-label="Back"
                    tabIndex={authOpen ? 0 : -1}
                >
                    <ArrowLeft size={18} weight="bold" />
                    <span>Back</span>
                </button>

                {/* Page dots — fade out as the shell transitions to auth. */}
                <div
                    className={`welcome-page-dots ${authOpen ? 'hidden' : ''}`}
                    role="tablist"
                    aria-label="Page navigation"
                >
                    {Array.from({ length: PAGE_COUNT }).map((_, i) => {
                        const fill = Math.max(0, 1 - Math.abs(listIndex - i))
                        return (
                            <button
                                key={i}
                                type="button"
                                className="page-dot"
                                onClick={() => goToPage(i)}
                                aria-label={`Go to page ${i + 1}`}
                                aria-current={Math.round(listIndex) === i ? 'page' : undefined}
                            >
                                <span
                                    className="page-dot-fill"
                                    style={{
                                        opacity: fill,
                                        transform: `scale(${fill})`,
                                    }}
                                />
                            </button>
                        )
                    })}
                </div>

                {/* The scroll list — its own concern. Receives shell progress so the
                    active deck page's intrinsic exit animation plays during deck↔auth. */}
                <PageDeck
                    ref={deckRef}
                    pages={pages}
                    outerProgress={shellProgress}
                    onPositionChange={setListIndex}
                    pageTransform={() => ({})}
                />

                {/* Auth panel — sibling layer, not a deck slide. Driven by the same
                    shellProgress tween. Renders its own intrinsic entrance/exit. */}
                <div className="welcome-auth-layer" style={authBlockStyle} aria-hidden={!authOpen}>
                    <div className="welcome-auth-content">
                        <div className="welcome-auth-greeting">
                            <Logo size={48} color="#ffffff" />
                            <h1 className="display-text welcome-auth-heading">Welcome</h1>
                        </div>
                        <p className="welcome-auth-subheading">
                            Pick a provider to continue. We'll only ask for the calendar permissions DropCal needs.
                        </p>
                        <div className="welcome-auth-buttons">
                            <MenuButton onClick={() => signIn('google')} icon={AuthGoogleIcon} variant="signin">
                                Sign in with Google
                            </MenuButton>
                            <MenuButton onClick={() => signIn('microsoft')} icon={AuthMicrosoftIcon} variant="signin">
                                Sign in with Microsoft
                            </MenuButton>
                            <MenuButton onClick={() => signIn('apple')} icon={AuthAppleIcon} variant="signin">
                                Sign in with Apple
                            </MenuButton>
                        </div>
                    </div>
                </div>
            </div>

            <div className="welcome-legal">
                <Link to="/privacy"><span className="legal-full">Privacy Policy</span><span className="legal-short">Privacy</span></Link>
                <span>·</span>
                <Link to="/terms"><span className="legal-full">Terms of Service</span><span className="legal-short">Terms</span></Link>
            </div>
        </div>
    )
}
