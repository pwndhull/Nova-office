/**
 * The Nova Office design-system explorer.
 *
 * This is the review surface for everything in `ui/` — it is where a token
 * change, a component change, or a motion change is seen before it is ported
 * to the native fork. It deliberately renders the real packages (aliased to
 * their sources in vite.config.ts), never a copy.
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { CommandPalette, useCommandPalette, type Command } from '@nova/components';
import { AppShell, type SceneId } from './shell/AppShell';
import { OverviewScene } from './scenes/OverviewScene';
import { ColorScene } from './scenes/ColorScene';
import { TypeScene } from './scenes/TypeScene';
import { SpaceScene } from './scenes/SpaceScene';
import { ComponentsScene } from './scenes/ComponentsScene';
import { IconsScene } from './scenes/IconsScene';
import { MotionScene } from './scenes/MotionScene';

const SCENES: Record<SceneId, () => ReactElement> = {
  overview: OverviewScene,
  color: ColorScene,
  type: TypeScene,
  space: SpaceScene,
  components: ComponentsScene,
  icons: IconsScene,
  motion: MotionScene,
};

export function App() {
  const [scene, setScene] = useState<SceneId>('overview');
  const palette = useCommandPalette();

  // The explorer eats its own dog food: navigation is exposed as commands, so
  // ⌘K works here exactly as it will in the suite.
  const commands: Command[] = (Object.keys(SCENES) as SceneId[]).map((id) => ({
    id: `go-${id}`,
    label: `Go to ${id[0]!.toUpperCase()}${id.slice(1)}`,
    group: 'Navigate',
    icon: 'arrow-right',
    keywords: [id],
    onRun: () => setScene(id),
  }));

  const Scene = SCENES[scene];

  return (
    <>
      <AppShell scene={scene} onSceneChange={setScene} onOpenPalette={() => palette.setOpen(true)}>
        <Scene />
      </AppShell>
      <CommandPalette
        open={palette.open}
        onClose={palette.onClose}
        commands={commands}
        placeholder="Search the design system…"
      />
    </>
  );
}
