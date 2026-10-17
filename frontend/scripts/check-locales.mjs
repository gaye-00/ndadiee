// Vérifie que chaque langue a les mêmes clés que le français (langue de référence).
// Les formes du pluriel (_one, _few, _many…) varient selon la langue : on compare les clés sans elles.
// Usage : npm run i18n:check
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES_DIR = join(import.meta.dirname, '..', 'src', 'i18n', 'locales');
const REFERENCE = 'fr';
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** Clés à plat (« nav.forum »), formes du pluriel regroupées */
function keysOf(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keysOf(value, `${prefix}${key}.`)
      : [`${prefix}${key}`.replace(PLURAL_SUFFIX, '')],
  );
}

function read(language, file) {
  return JSON.parse(readFileSync(join(LOCALES_DIR, language, file), 'utf8'));
}

const languages = readdirSync(LOCALES_DIR).filter((name) => name !== REFERENCE);
const namespaces = readdirSync(join(LOCALES_DIR, REFERENCE)).filter((file) => file.endsWith('.json'));
let problems = 0;

for (const namespace of namespaces) {
  const reference = new Set(keysOf(read(REFERENCE, namespace)));
  for (const language of languages) {
    let keys;
    try {
      keys = new Set(keysOf(read(language, namespace)));
    } catch (error) {
      console.error(`✗ ${language}/${namespace} : ${error.message}`);
      problems++;
      continue;
    }
    const missing = [...reference].filter((key) => !keys.has(key));
    const extra = [...keys].filter((key) => !reference.has(key));
    if (missing.length > 0 || extra.length > 0) {
      problems++;
      console.error(`✗ ${language}/${namespace}`);
      missing.forEach((key) => console.error(`    manquante : ${key}`));
      extra.forEach((key) => console.error(`    en trop   : ${key}`));
    }
  }
}

if (problems > 0) {
  process.exitCode = 1;
} else {
  console.log(`✓ ${languages.length + 1} langues, ${namespaces.length} espace(s) de noms : mêmes clés partout`);
}
