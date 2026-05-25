/**
 * CI lint rule: every non-GET controller method that's not @Public must
 * carry @Audit or @AuditRead. Catches missing audit on privileged actions.
 *
 * Usage: npm run lint:audit-presence
 * Exit 0 = clean. Exit 1 = violations printed.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', 'src');
const METHOD_RE = /@(Post|Patch|Put|Delete|Get)\s*\(/g;
const KNOWN_SENSITIVE_READ_PATHS = [
  /patients\/search/,
  /patient-list/,
  /patient-match/,
  /audit\/search/,
  /lab-admins\/labs\//,
  /reports\/me/,
];

interface Violation {
  file: string;
  line: number;
  snippet: string;
  reason: string;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.controller.ts')) out.push(full);
  }
  return out;
}

function lint(file: string): Violation[] {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const violations: Violation[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/@(Post|Patch|Put|Delete|Get)\b/);
    if (!m) continue;
    const verb = m[1];
    // Look back up to 8 lines for decorators
    const window = lines
      .slice(Math.max(0, i - 8), i + 1)
      .join('\n');
    const isPublic = /@Public\b/.test(window);
    const hasAudit = /@Audit\b/.test(window);
    const hasAuditRead = /@AuditRead\b/.test(window);
    const requiresAudit =
      verb !== 'Get' ||
      KNOWN_SENSITIVE_READ_PATHS.some((rx) => rx.test(lines[i]));
    if (isPublic) continue;
    if (requiresAudit && !hasAudit && !hasAuditRead) {
      violations.push({
        file,
        line: i + 1,
        snippet: lines[i].trim(),
        reason: `${verb} method missing @Audit/@AuditRead decorator`,
      });
    }
  }
  return violations;
}

function main() {
  const files = walk(ROOT);
  let total = 0;
  for (const f of files) {
    const v = lint(f);
    if (v.length > 0) {
      total += v.length;
      for (const x of v) {
        console.error(`${path.relative(ROOT, x.file)}:${x.line} — ${x.reason}\n  ${x.snippet}`);
      }
    }
  }
  if (total > 0) {
    console.error(`\naudit-presence-lint: ${total} violation(s).`);
    process.exit(1);
  }
  console.log('audit-presence-lint: clean.');
}

main();
