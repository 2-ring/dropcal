import { CaretRight } from '@phosphor-icons/react'
import './TopBar.css'

export function TopBar() {
    return (
        <a href="#" className="top-bar" onClick={(e) => e.preventDefault()}>
            <div className="top-bar-content">
                <span className="top-bar-text">
                    Join the beta — early access to one-click scheduling.
                </span>
                <span className="top-bar-link">
                    Join now <CaretRight weight="bold" size={12} />
                </span>
            </div>
        </a>
    )
}
