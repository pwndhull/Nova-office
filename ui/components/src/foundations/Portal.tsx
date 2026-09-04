/**
 * Render into a detached container at the end of `<body>`.
 *
 * Overlays need this so they escape ancestor `overflow: hidden` and stacking
 * contexts. A `transform` or `filter` anywhere up the tree creates a containing
 * block that a `position: fixed` dialog would otherwise be clipped by — and
 * that ancestor is usually somebody's animation, added later, far away.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

export interface PortalProps {
  children: ReactNode;
  /** Existing element to render into. Defaults to a managed container on body. */
  container?: HTMLElement | null;
}

const CONTAINER_ID = 'nova-portal-root';

function getManagedContainer(): HTMLElement {
  const existing = document.getElementById(CONTAINER_ID);
  if (existing) return existing;

  const created = document.createElement('div');
  created.id = CONTAINER_ID;
  // The container itself must not participate in layout; each overlay
  // positions itself.
  created.style.position = 'relative';
  created.style.zIndex = 'var(--nova-zindex-overlay, 900)';
  document.body.appendChild(created);
  return created;
}

export function Portal({ children, container }: PortalProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Deferred to an effect so nothing touches the DOM during render, which
    // keeps this safe under SSR and React strict mode.
    setTarget(container ?? getManagedContainer());
  }, [container]);

  if (!target) return null;
  return createPortal(children, target);
}
