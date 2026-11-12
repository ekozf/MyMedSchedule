import { describe, it, expect, vi } from 'vitest';

vi.mock('expo-print', () => ({ printToFileAsync: vi.fn() }));
vi.mock('@react-navigation/native', () => ({ CommonActions: { reset: vi.fn() } }));
vi.mock('@/lib/db', () => ({ getDatabase: vi.fn() }));

import { escapeHtml, generatePDFHTML, type ExportData } from '@/lib/export/pdf';

const EVIL = `<script>alert("x")</script> & 'q'`;

function data(): ExportData {
  const now = new Date('2026-11-10T09:00:00Z');
  return {
    profile: {
      id: 'p',
      name: EVIL,
      settings: {} as any,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    medicationsWithLogs: [
      {
        medication: {
          id: 'm',
          profileId: 'p',
          name: `<img src=x onerror=alert(1)>`,
          strength: `5 mg <b>`,
          notes: EVIL,
          dosageAmount: 1,
          dosageUnit: '<u>unit</u>' as any,
          scheduleType: 'once_daily' as any,
          scheduleConfig: '{}',
          inventoryCount: 0,
          trackSupply: true,
          bypassDnd: false,
          isActive: true,
          isPrn: false,
          createdAt: now,
          updatedAt: now,
        } as any,
        logs: [
          {
            id: 'l',
            medicationId: 'm',
            profileId: 'p',
            scheduledTime: now,
            actualTime: now,
            action: 'taken',
            dosageAmount: 1,
            notes: EVIL,
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
    ],
    startDate: now,
    endDate: now,
  };
}

describe('PDF escaping', () => {
  it('escapeHtml', () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;'
    );
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(2.5)).toBe('2.5');
  });

  it('escapes every user-provided string in the report', () => {
    const html = generatePDFHTML(data());
    const body = html.slice(html.indexOf('<body>'));
    expect(body).not.toContain('<script>');
    expect(body).not.toContain('<img');
    expect(body).not.toContain('<u>');
    expect(body).not.toContain('<b>');
    expect(body).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;');
    expect(body).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});

describe('PDF report format', () => {
  const now = new Date(2026, 10, 10, 15, 5);
  function report(use24HourTime: boolean | undefined) {
    const d = data();
    d.profile.name = 'Anna';
    d.profile.settings = { use24HourTime } as any;
    const med = d.medicationsWithLogs[0].medication;
    Object.assign(med, { name: 'Omeprazole', strength: '20 mg', notes: undefined, dosageUnit: 'pills', scheduleConfig: '{"time":"20:30"}' });
    const log = d.medicationsWithLogs[0].logs[0];
    Object.assign(log, { notes: undefined, scheduledTime: new Date(2026, 10, 9, 20, 30), actualTime: new Date(2026, 10, 9, 21, 15) });
    return generatePDFHTML(d, now);
  }

  it('uses 24-hour times when the profile asks for it (the default)', () => {
    for (const html of [report(true), report(undefined)]) {
      expect(html).toContain('20:30');
      expect(html).toContain('21:15');
      expect(html).toContain('Made on 10 Nov 2026 at 15:05');
      expect(html).not.toMatch(/\d:\d\d [AP]M/);
    }
  });

  it('uses 12-hour times when 24-hour time is off', () => {
    const html = report(false);
    expect(html).toContain('8:30 PM');
    expect(html).toContain('9:15 PM');
    expect(html).not.toContain('20:30');
  });

  it('uses the Pill Box palette, sentence-case labels and plural-aware doses', () => {
    const html = report(true);
    expect(html).not.toMatch(/#2563eb|#eff6ff|gradient/i);
    expect(html).toContain('#1B5E4A');
    expect(html).toContain('Medication report');
    expect(html).toContain('Planned for');
    expect(html).toContain('Every day at 20:30');
    expect(html).toContain('1 pill');
    expect(html).toContain('<span class="late">Late</span>');
  });
});
