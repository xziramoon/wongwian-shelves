import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  trailing?: ReactNode;
}

/** iOS 16-style large-title navigation bar — sticky, blurred, with an optional
 * "‹ back" leading button and trailing accessory (icons/status). */
export default function IosNavBar({ title, subtitle, onBack, backLabel, trailing }: Props) {
  return (
    <div className="ios-nav">
      <div className="ios-nav-bar-row">
        {onBack ? (
          <button type="button" className="ios-nav-back" onClick={onBack}>
            ‹ {backLabel || 'กลับ'}
          </button>
        ) : (
          <span />
        )}
        <div className="ios-nav-trailing">{trailing}</div>
      </div>
      <div className={`ios-nav-title-large${subtitle ? ' with-sub' : ''}`}>{title}</div>
      {subtitle && <div className="ios-nav-subtitle">{subtitle}</div>}
    </div>
  );
}
