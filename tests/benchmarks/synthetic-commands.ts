import type { Command } from '@nova/components';

const VERBS = ['New', 'Open', 'Close', 'Duplicate', 'Rename', 'Move', 'Export', 'Import', 'Insert', 'Delete', 'Format', 'Align', 'Convert', 'Merge', 'Split', 'Toggle', 'Show', 'Hide', 'Reset', 'Apply'];
const NOUNS = ['Document', 'Spreadsheet', 'Presentation', 'Slide', 'Table', 'Chart', 'Image', 'Comment', 'Footnote', 'Header', 'Footer', 'Section', 'Column', 'Row', 'Cell', 'Style', 'Template', 'Bookmark', 'Hyperlink', 'Page Break', 'Text Box', 'Shape', 'Formula', 'Pivot Table', 'Conditional Format'];
const GROUPS = ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Table', 'Slide Show', 'Data', 'Window'];

/** A deterministic ~500-command set that looks like a real office suite's palette. */
export function syntheticCommands(count = 500): Command[] {
  const commands: Command[] = [];
  let i = 0;
  outer: for (const verb of VERBS) {
    for (const noun of NOUNS) {
      commands.push({
        id: `cmd-${i}`,
        label: `${verb} ${noun}`,
        group: GROUPS[i % GROUPS.length]!,
        keywords: i % 3 === 0 ? [noun.toLowerCase(), verb.toLowerCase()] : undefined,
        onRun: () => {},
      });
      if (++i >= count) break outer;
    }
  }
  return commands;
}
