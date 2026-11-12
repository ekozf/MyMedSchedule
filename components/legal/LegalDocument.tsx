/**
 * A plain-language legal page (Your data and privacy, Terms of use): title1 + one-sentence
 * subtitle, then sections with a title3 heading and short paragraphs / bullet lists (parsed from
 * the string files by `parseLegalBody`), a "Last updated … · Version …" line and optional link
 * rows at the bottom.
 *
 * @example
 * <LegalDocument title="Terms of use" subtitle="…" sections={[{ key, title, body }]}
 *   updated="Last updated 12 November 2026 · Version 1.0" links={<ListGroup>…</ListGroup>} />
 */
import * as React from 'react';
import { View } from 'react-native';
import { NavHeader, Screen, Text } from '@/components/ds';
import { parseLegalBody } from '@/lib/legal/legal-text';

export interface LegalSection {
  key: string;
  title: string;
  body: string;
}

export interface LegalDocumentProps {
  title: string;
  subtitle?: string;
  sections: LegalSection[];
  updated?: string;
  /** Rows under the text (links to related pages / the full online text). */
  links?: React.ReactNode;
}

export function LegalBody({ body }: { body: string }) {
  const blocks = React.useMemo(() => parseLegalBody(body), [body]);
  return (
    <View style={{ gap: 12 }}>
      {blocks.map((block, i) =>
        block.kind === 'paragraph' ? (
          <Text key={i} variant="body">
            {block.text}
          </Text>
        ) : (
          <View key={i} style={{ gap: 8 }}>
            {block.items.map((item, j) => (
              <View key={j} style={{ flexDirection: 'row', gap: 10, paddingRight: 4 }}>
                <Text variant="body" importantForAccessibility="no" accessible={false}>
                  •
                </Text>
                <Text variant="body" style={{ flex: 1 }}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        )
      )}
    </View>
  );
}

export function LegalDocument({ title, subtitle, sections, updated, links }: LegalDocumentProps) {
  return (
    <Screen header={<NavHeader />}>
      <View style={{ gap: 8, marginBottom: 28, paddingTop: 8 }}>
        <Text variant="title1" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: 28 }}>
        {sections.map((s) => (
          <View key={s.key} style={{ gap: 10 }}>
            <Text variant="title3" accessibilityRole="header">
              {s.title}
            </Text>
            <LegalBody body={s.body} />
          </View>
        ))}
      </View>
      {links ? <View style={{ marginTop: 32 }}>{links}</View> : null}
      {updated ? (
        <Text variant="footnote" tone="secondary" style={{ marginTop: 24, marginBottom: 8 }}>
          {updated}
        </Text>
      ) : null}
    </Screen>
  );
}
