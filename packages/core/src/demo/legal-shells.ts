export type DemoLegalKind = 'imprint' | 'privacy';

export const DEMO_DISCLAIMER = {
  en: 'SAMPLE CONTENT - INCOMPLETE - REPLACE BEFORE PRODUCTION',
  de: 'BEISPIELINHALT - UNVOLLSTAENDIG - VOR PRODUKTIVBETRIEB ERSETZEN',
} as const;

export interface DemoLegalShell {
  readonly kind: DemoLegalKind;
  readonly locale: string;
  readonly title: string;
  readonly disclaimer: string;
  readonly sections: readonly { readonly heading: string; readonly body: string }[];
}

const SHELLS = {
  en: {
    imprint: { title: 'Imprint (sample)', headings: ['Provider', 'Contact', 'Responsible for content'] },
    privacy: { title: 'Privacy policy (sample)', headings: ['Controller', 'Data processed', 'Your rights', 'Retention'] },
    body: 'Placeholder paragraph. This section is a structural shell only and contains no legal text. Have it written and reviewed by a qualified professional.',
  },
  de: {
    imprint: { title: 'Impressum (Beispiel)', headings: ['Anbieter', 'Kontakt', 'Inhaltlich verantwortlich'] },
    privacy: { title: 'Datenschutzerklaerung (Beispiel)', headings: ['Verantwortliche Stelle', 'Verarbeitete Daten', 'Ihre Rechte', 'Speicherdauer'] },
    body: 'Platzhalterabsatz. Dieser Abschnitt ist nur ein Strukturgeruest und enthaelt keinen Rechtstext. Bitte von einer fachkundigen Person verfassen und pruefen lassen.',
  },
} as const;

export function generateDemoLegalShells(locales: readonly string[]): DemoLegalShell[] {
  const out: DemoLegalShell[] = [];
  for (const locale of locales) {
    const lang = locale.toLowerCase().startsWith('de') ? 'de' : 'en';
    const catalog = SHELLS[lang];
    for (const kind of ['imprint', 'privacy'] as const) {
      out.push({
        kind,
        locale,
        title: catalog[kind].title,
        disclaimer: DEMO_DISCLAIMER[lang],
        sections: catalog[kind].headings.map((heading) => ({ heading, body: catalog.body })),
      });
    }
  }
  return out;
}

export function validateDemoLegalShell(shell: DemoLegalShell): void {
  const required = Object.values(DEMO_DISCLAIMER) as string[];
  if (!required.includes(shell.disclaimer)) {
    throw new Error(`Legal shell ${shell.kind}/${shell.locale}: missing sample/incomplete disclaimer`);
  }
}
