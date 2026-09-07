// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 The Nova-Office contributors
//
// Minimal, dependency-free YAML *subset* parser — just enough for
// product/product.yaml. Supported:
//   - `# comments` (whole-line and trailing on scalar lines)
//   - nested mappings by 2-space indentation
//   - scalars: "double quoted", 'single quoted', bare strings, integers,
//     floats, true/false, null/~ , and [] / {} empty collections
//   - block sequences ("- item") of scalars
// NOT supported (throws): anchors, tags, multi-line/flow collections with
// content, complex keys. Keep product.yaml within this subset.

export function parseYamlMini(text) {
  const rawLines = text.split(/\r?\n/);
  const lines = [];
  rawLines.forEach((line, i) => {
    if (/^\s*(#.*)?$/.test(line)) return; // blank / comment-only
    const indent = line.length - line.replace(/^ +/, "").length;
    if (indent % 2 !== 0) throw new Error(`yaml-mini: odd indent at line ${i + 1}`);
    lines.push({ n: i + 1, indent, content: line.slice(indent) });
  });

  let pos = 0;
  const scalar = (s) => {
    s = stripTrailingComment(s).trim();
    if (s === "" || s === "~" || s === "null") return null;
    if (s === "true") return true;
    if (s === "false") return false;
    if (s === "[]") return [];
    if (s === "{}") return {};
    if (/^-?\d+$/.test(s)) return Number(s);
    if (/^-?\d+\.\d+$/.test(s)) return Number(s);
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      const q = s[0];
      const body = s.slice(1, -1);
      return q === '"' ? body.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\")
                       : body.replace(/''/g, "'");
    }
    return s;
  };

  function parseBlock(minIndent) {
    // decide: sequence or mapping (based on first line at this indent)
    const first = lines[pos];
    if (!first || first.indent < minIndent) return null;
    const indent = first.indent;
    if (first.content.startsWith("- ")) {
      const arr = [];
      while (pos < lines.length && lines[pos].indent === indent && lines[pos].content.startsWith("- ")) {
        arr.push(scalar(lines[pos].content.slice(2)));
        pos++;
      }
      return arr;
    }
    const obj = {};
    while (pos < lines.length && lines[pos].indent === indent) {
      const { n, content } = lines[pos];
      const m = /^([A-Za-z0-9_.\-]+):(?:\s+(.*))?$/.exec(content);
      if (!m) throw new Error(`yaml-mini: cannot parse line ${n}: "${content}"`);
      const key = m[1];
      const inline = m[2];
      pos++;
      if (inline !== undefined && stripTrailingComment(inline).trim() !== "") {
        obj[key] = scalar(inline);
      } else {
        const child = parseBlock(indent + 2);
        obj[key] = child === null ? null : child;
      }
    }
    return obj;
  }

  const result = parseBlock(0);
  if (pos !== lines.length) {
    throw new Error(`yaml-mini: unexpected content at line ${lines[pos].n}`);
  }
  return result ?? {};
}

function stripTrailingComment(s) {
  // remove ` # comment` not inside quotes
  let out = "";
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      out += c;
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
      out += c;
    } else if (c === "#" && (i === 0 || /\s/.test(s[i - 1]))) {
      break;
    } else {
      out += c;
    }
  }
  return out;
}
