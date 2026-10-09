const KEYWORDS = new Set([
  "pragma", "solidity", "contract", "interface", "library", "function", "modifier",
  "constructor", "fallback", "receive", "returns", "return", "external", "internal",
  "public", "private", "view", "pure", "payable", "memory", "calldata", "storage",
  "mapping", "event", "emit", "require", "assert", "revert", "if", "else", "for",
  "while", "do", "break", "continue", "new", "delete", "is", "using", "import",
  "from", "struct", "enum", "immutable", "constant", "override", "virtual", "try",
  "catch", "unchecked", "indexed", "anonymous", "assembly", "let", "type", "abstract",
]);

const TYPES = new Set([
  "uint", "uint8", "uint16", "uint32", "uint64", "uint128", "uint256",
  "int", "int8", "int16", "int32", "int64", "int128", "int256",
  "address", "bool", "string", "bytes", "bytes1", "bytes2", "bytes4", "bytes8",
  "bytes16", "bytes32", "byte",
]);

const GLOBALS = new Set([
  "msg", "block", "tx", "now", "this", "super", "abi", "keccak256", "sha256",
  "ripemd160", "ecrecover", "addmod", "mulmod", "selfdestruct", "gasleft",
  "blockhash", "type",
]);

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Coloration syntaxique Solidity « maison » (sans dépendance) : tokenise une ligne
 * en espaces/commentaires/mots, puis classe les mots en mots-clés, types, globals
 * et appels de fonction. Robuste : retombe toujours sur du texte échappé.
 */
export function highlightSolidity(line: string): string {
  // Commentaires (// ... et /* ... */ sur une ligne).
  const comment = line.indexOf("//");
  let codePart = line;
  let commentPart = "";
  if (comment !== -1) {
    codePart = line.slice(0, comment);
    commentPart = line.slice(comment);
  }

  const tokens = codePart.split(/(\s+|[(){}[\];,.=+\-*/%!<>&|^?:]+)/g);
  const out: string[] = [];

  for (const tk of tokens) {
    if (tk === "" || tk === undefined) continue;
    if (/^\s+$/.test(tk)) {
      out.push(escapeHtml(tk));
      continue;
    }
    if (/^[(){}\[\];,.=+\-*/%!<>&|^?:]+$/.test(tk)) {
      out.push(`<span class="tok-punc">${escapeHtml(tk)}</span>`);
      continue;
    }
    if (KEYWORDS.has(tk)) {
      out.push(`<span class="tok-kw">${escapeHtml(tk)}</span>`);
    } else if (TYPES.has(tk)) {
      out.push(`<span class="tok-type">${escapeHtml(tk)}</span>`);
    } else if (GLOBALS.has(tk)) {
      out.push(`<span class="tok-glob">${escapeHtml(tk)}</span>`);
    } else if (/^\d+$/.test(tk)) {
      out.push(`<span class="tok-num">${escapeHtml(tk)}</span>`);
    } else {
      out.push(escapeHtml(tk));
    }
  }

  if (commentPart) out.push(`<span class="tok-com">${escapeHtml(commentPart)}</span>`);
  return out.join("");
}
