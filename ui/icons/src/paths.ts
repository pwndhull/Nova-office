/**
 * Nova icon path data.
 *
 * Every icon is drawn on a 24×24 grid with a 2px live area of padding, as a
 * single 1.75px stroke with round caps and joins. Nothing is filled. Keeping
 * stroke weight and terminal style out of the path data and in the <Icon>
 * primitive is what stops the set drifting as it grows — a contributor cannot
 * accidentally ship a 2.5px icon.
 *
 * Geometry rules:
 *  - Snap to whole or half pixels on the 24 grid; a 0.3px offset blurs at 16px.
 *  - Optical alignment beats mathematical centring. A triangle (play, chevron)
 *    is nudged right so its visual mass sits centred, not its bounding box.
 *  - Prefer 3 strokes over 6. These render at 16px far more often than at 24px.
 */

/** Every icon in the set. Adding a name here is a compile error until the path exists. */
export type IconName =
  // documents
  | 'document'
  | 'document-new'
  | 'spreadsheet'
  | 'presentation'
  | 'drawing'
  | 'folder'
  | 'folder-open'
  // actions
  | 'search'
  | 'plus'
  | 'minus'
  | 'close'
  | 'check'
  | 'trash'
  | 'download'
  | 'upload'
  | 'share'
  | 'copy'
  | 'undo'
  | 'redo'
  | 'settings'
  | 'more-horizontal'
  | 'more-vertical'
  | 'filter'
  | 'sort'
  // navigation
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'arrow-right'
  | 'sidebar'
  | 'panel-right'
  | 'command'
  // text formatting
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'align-justify'
  | 'list-bullet'
  | 'list-numbered'
  | 'link'
  | 'text-size'
  // objects
  | 'image'
  | 'table'
  | 'chart'
  | 'shape'
  | 'comment'
  // state
  | 'star'
  | 'star-filled'
  | 'clock'
  | 'users'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'sparkle'
  | 'focus'
  | 'sun'
  | 'moon'
  | 'warning'
  | 'info'
  | 'play'
  | 'pause';

/**
 * Path data, keyed by name. Values are the `d` attribute of one or more
 * sub-paths joined into a single string where they share styling.
 */
export const iconPaths: Record<IconName, string> = {
  // --- documents ---------------------------------------------------------
  document: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5',
  'document-new':
    'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M12 12v5M9.5 14.5h5',
  spreadsheet:
    'M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM5 9h14M5 15h14M12 9v12',
  presentation: 'M3 4h18M4.5 4v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V4M9.5 20l2.5-4 2.5 4',
  drawing: 'M4 20l4.5-1.5L20.5 6.5a2.1 2.1 0 0 0-3-3L5.5 15.5z M14.5 6.5l3 3',
  folder: 'M3 7.5A2 2 0 0 1 5 5.5h4l2 2.5h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  'folder-open':
    'M3 8V6.5a2 2 0 0 1 2-2h4l2 2.5h6a2 2 0 0 1 2 2V10M3 10.5h17.2a1 1 0 0 1 .96 1.28l-2 7A2 2 0 0 1 17.24 20H5a2 2 0 0 1-2-2z',

  // --- actions -----------------------------------------------------------
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16.2 16.2L21 21',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  trash: 'M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M10.5 11v6M13.5 11v6',
  download: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M4 19h16',
  upload: 'M12 15V4M7.5 8.5L12 4l4.5 4.5M4 19h16',
  share: 'M12 3v12M8 7l4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',
  copy: 'M9 9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  undo: 'M4 9h11a5 5 0 0 1 0 10h-6M4 9l4-4M4 9l4 4',
  redo: 'M20 9H9a5 5 0 0 0 0 10h6M20 9l-4-4M20 9l-4 4',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.46V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9.1 19.4a1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.46-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9.1a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 1-1.46V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.46 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.46 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.46 1z',
  'more-horizontal':
    'M5.6 12a.9.9 0 1 0 0-.01M12 12a.9.9 0 1 0 0-.01M18.4 12a.9.9 0 1 0 0-.01',
  'more-vertical': 'M12 5.6a.9.9 0 1 0 0-.01M12 12a.9.9 0 1 0 0-.01M12 18.4a.9.9 0 1 0 0-.01',
  filter: 'M4 6h16l-6.2 7.2v5.3l-3.6 1.8v-7.1z',
  sort: 'M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3',

  // --- navigation --------------------------------------------------------
  'chevron-down': 'M6.5 9.5L12 15l5.5-5.5',
  'chevron-up': 'M6.5 14.5L12 9l5.5 5.5',
  'chevron-left': 'M14.5 6.5L9 12l5.5 5.5',
  'chevron-right': 'M9.5 6.5L15 12l-5.5 5.5',
  'arrow-right': 'M4 12h15M13 6l6 6-6 6',
  sidebar: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM10 4v16',
  'panel-right': 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM15 4v16',
  command:
    'M9 9V6.5a2.5 2.5 0 1 0-2.5 2.5H9zm0 0h6m-6 0v6m6-6V6.5A2.5 2.5 0 1 1 17.5 9H15zm0 6v-6m0 6h2.5A2.5 2.5 0 1 1 15 17.5V15zm-6 0h6m-6 0v2.5A2.5 2.5 0 1 1 6.5 15H9z',

  // --- text formatting ---------------------------------------------------
  bold: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',
  italic: 'M15 5h-4M13 19H9M14 5l-3 14',
  underline: 'M7 4v7a5 5 0 0 0 10 0V4M5 20h14',
  strikethrough: 'M4 12h16M7.5 8.5A3.5 3.5 0 0 1 11 5h2.5a3.2 3.2 0 0 1 3 2M16 15a3.5 3.5 0 0 1-3.5 4H11a3.4 3.4 0 0 1-3.3-2.5',
  'align-left': 'M4 6h16M4 10.5h10M4 15h16M4 19.5h10',
  'align-center': 'M4 6h16M7 10.5h10M4 15h16M7 19.5h10',
  'align-right': 'M4 6h16M10 10.5h10M4 15h16M10 19.5h10',
  'align-justify': 'M4 6h16M4 10.5h16M4 15h16M4 19.5h16',
  'list-bullet': 'M9 6h11M9 12h11M9 18h11M4.6 6a.6.6 0 1 0 0-.01M4.6 12a.6.6 0 1 0 0-.01M4.6 18a.6.6 0 1 0 0-.01',
  'list-numbered': 'M10 6h10M10 12h10M10 18h10M4 4.5h1V9M4 9h2M4 14.2a1.2 1.2 0 1 1 2 .8L4 19h2.2',
  link: 'M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.54 3.54 0 0 0-5-5l-1.6 1.6M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.54 3.54 0 0 0 5 5l1.6-1.6',
  'text-size': 'M4 8V6h9v2M8.5 6v13M6.5 19h4M14 12.5v-1.2h6v1.2M17 11.3V19M15.5 19h3',

  // --- objects -----------------------------------------------------------
  image:
    'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM9 10.5a1.3 1.3 0 1 0 0-.01M20 15l-4.5-4.5L6 20',
  table:
    'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 9.5h16M4 14.5h16M10 9.5V20',
  chart: 'M4 20V4M4 20h16M8 20v-6M12.5 20V9M17 20v-9.5',
  shape: 'M4 7a3 3 0 0 1 3-3 3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3zM13 14h7v6h-7z',
  comment: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4z',

  // --- state -------------------------------------------------------------
  star: 'M12 3.8l2.6 5.3 5.9.85-4.25 4.15 1 5.9L12 17.2l-5.25 2.8 1-5.9L3.5 9.95l5.9-.85z',
  'star-filled': 'M12 3.8l2.6 5.3 5.9.85-4.25 4.15 1 5.9L12 17.2l-5.25 2.8 1-5.9L3.5 9.95l5.9-.85z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5.2l3.4 2',
  users:
    'M15.5 20v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.2V20M9.25 11.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2zM21 20v-1.8a3.6 3.6 0 0 0-2.7-3.48M15.6 4.2a3.6 3.6 0 0 1 0 6.98',
  lock: 'M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'eye-off':
    'M9.9 5.8A8.6 8.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15.7 15.7 0 0 1-2.85 3.7M6.3 7.85A15.6 15.6 0 0 0 2.5 12S6 18.5 12 18.5a8.7 8.7 0 0 0 3.6-.77M10 10.1a3 3 0 0 0 4.05 4.2M3.5 3.5l17 17',
  sparkle:
    'M12 3.5l1.7 4.6 4.6 1.7-4.6 1.7L12 16.1l-1.7-4.6-4.6-1.7 4.6-1.7zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  focus:
    'M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5a8.6 8.6 0 1 0 10.8 10.8z',
  warning: 'M12 4.5l8.5 15h-17zM12 10v4.2M12 17.2a.15.15 0 1 0 0-.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.8a.15.15 0 1 0 0-.01',
  play: 'M8.5 5.4l10 6.6-10 6.6z',
  pause: 'M9 5v14M15 5v14',
};

/**
 * Icons drawn as filled shapes rather than strokes.
 *
 * Only a handful qualify: a "selected" state needs a solid mass to read at
 * 16px, and outlining it would just make it look unselected-but-bolder.
 */
export const filledIcons: ReadonlySet<IconName> = new Set<IconName>([
  'star-filled',
  'play',
]);

export const iconNames = Object.keys(iconPaths) as IconName[];
