/**
 * ExpandIcon component for collapsible menus.
 * Shows chevrons that rotate based on expanded state.
 */

import { CaretDown } from '@phosphor-icons/react';
import './ExpandIcon.css';

interface ExpandIconProps {
  isExpanded: boolean;
  size?: number;
}

export function ExpandIcon({ isExpanded, size = 16 }: ExpandIconProps) {
  return (
    <div className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
      <CaretDown size={size} weight="bold" />
    </div>
  );
}
