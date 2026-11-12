import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Directory, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { format, subDays } from 'date-fns';
import { getDatabase } from '@/lib/db';
import { intakeLogs, medications, profiles } from '@/lib/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import type { IntakeLog, Medication, Profile } from '@/types';
import i18n, { getCurrentLocale } from '@/lib/i18n';
import { getDateFnsLocale } from '@/lib/i18n/date-fns';
import { describeSchedule, medicineDisplayName } from '@/components/medicines/medicine-info';
import { formatNumber, formatShortDate, formatTime, formatTimeString } from '@/lib/ui/format';
import { withAutoLockSuspended } from '@/lib/auth/auto-lock';

// Helper to convert null to undefined
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Everything put into the report HTML goes through this: names, strength, notes, units and also
 * translated labels (a translation could contain `&` or `<`). Null / undefined become ''.
 */
export function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** i18n.t, HTML-escaped. */
const th = (key: string, options?: Record<string, unknown>) => escapeHtml(i18n.t(key, options));

export interface MedicationWithLogs {
  medication: Medication;
  logs: IntakeLog[];
}

export interface ExportData {
  profile: Profile;
  medicationsWithLogs: MedicationWithLogs[];
  startDate: Date;
  endDate: Date;
}

/**
 * Get all intake logs from the last X days with medication details
 */
export async function getExportData(profileId: string, days: number = 60): Promise<ExportData> {
  const db = getDatabase();
  const endDate = new Date();
  const startDate = subDays(endDate, days);

  // Get profile
  const profileData = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);

  if (!profileData || profileData.length === 0) {
    throw new Error('Profile not found');
  }

  const profile: Profile = {
    id: profileData[0].id,
    name: profileData[0].name,
    avatarUri: nullToUndefined(profileData[0].avatarUri),
    settings: JSON.parse(profileData[0].settings),
    createdAt: new Date(profileData[0].createdAt),
    updatedAt: new Date(profileData[0].updatedAt),
    isActive: Boolean(profileData[0].isActive),
  };

  // Get all medications for this profile
  const medicationsData = await db
    .select()
    .from(medications)
    .where(eq(medications.profileId, profileId));

  // Get intake logs for the last X days
  const logsData = await db
    .select()
    .from(intakeLogs)
    .where(
      and(eq(intakeLogs.profileId, profileId), gte(intakeLogs.actualTime, startDate.toISOString()))
    )
    .orderBy(desc(intakeLogs.actualTime));

  // Convert logs to proper types
  const logs: IntakeLog[] = logsData.map((log) => ({
    id: log.id,
    medicationId: log.medicationId,
    profileId: log.profileId,
    scheduledTime: log.scheduledTime ? new Date(log.scheduledTime) : undefined,
    actualTime: new Date(log.actualTime),
    action: log.action as 'taken' | 'skipped' | 'partial',
    dosageAmount: log.dosageAmount,
    notes: nullToUndefined(log.notes),
    createdAt: new Date(log.createdAt),
    updatedAt: new Date(log.updatedAt),
  }));

  // Group logs by medication
  const medicationsWithLogs: MedicationWithLogs[] = medicationsData.map((med) => {
    const medication: Medication = {
      id: med.id,
      profileId: med.profileId,
      name: med.name,
      strength: nullToUndefined(med.strength),
      imageUri: nullToUndefined(med.imageUri),
      notes: nullToUndefined(med.notes),
      dosageAmount: med.dosageAmount,
      dosageUnit: med.dosageUnit as any,
      scheduleType: med.scheduleType as any,
      scheduleConfig: med.scheduleConfig,
      inventoryCount: med.inventoryCount || 0,
      trackSupply: med.trackSupply !== false,
      packageSize: nullToUndefined(med.packageSize),
      maxDailyDose: nullToUndefined(med.maxDailyDose),
      minHoursBetweenDoses: nullToUndefined(med.minHoursBetweenDoses),
      expirationDate: med.expirationDate ? new Date(med.expirationDate) : undefined,
      refillReminderType: nullToUndefined(med.refillReminderType as 'days' | 'doses' | null),
      refillReminderValue: nullToUndefined(med.refillReminderValue),
      bypassDnd: Boolean(med.bypassDnd),
      isActive: Boolean(med.isActive),
      isPrn: Boolean(med.isPrn),
      scheduleStartDate: med.scheduleStartDate ? new Date(med.scheduleStartDate) : undefined,
      nextDoseOverrideTime: med.nextDoseOverrideTime
        ? new Date(med.nextDoseOverrideTime)
        : undefined,
      createdAt: new Date(med.createdAt),
      updatedAt: new Date(med.updatedAt),
    };

    const medLogs = logs.filter((log) => log.medicationId === med.id);

    return {
      medication,
      logs: medLogs,
    };
  });

  return {
    profile,
    medicationsWithLogs,
    startDate,
    endDate,
  };
}

/** Pill Box print palette (light theme of lib/theme.ts): flat, no blue, no gradients. */
const PRINT = {
  bg: '#FFFFFF',
  field: '#F1F3F2',
  ink: '#141A17',
  ink2: '#4F5955',
  line: '#E2E6E4',
  line2: '#B5BDB9',
  accent: '#1B5E4A',
  doneInk: '#175239',
  late: '#B4530A',
  danger: '#A4342A',
} as const;

/** Minutes after the planned time from which an intake counts as late in the report. */
const LATE_AFTER_MINUTES = 30;

/**
 * Generate HTML for the PDF report. Times follow the profile's 24-hour setting and dates the
 * app's language, the same as in the app (lib/ui/format).
 */
export function generatePDFHTML(data: ExportData, now: Date = new Date()): string {
  const { profile, medicationsWithLogs, startDate, endDate } = data;
  const is24h = profile.settings?.use24HourTime ?? true;
  const dateLocale = getDateFnsLocale();

  // All helpers return HTML-safe text.
  const time = (date: Date) => escapeHtml(formatTime(date, is24h));
  const day = (date: Date) => escapeHtml(format(date, 'd MMM yyyy', { locale: dateLocale }));
  /** "Tue 10 Nov, 08:00" (year added when not this year). */
  const dayTime = (date: Date) => `${escapeHtml(formatShortDate(date, now))}, ${time(date)}`;
  const timeString = (value: string) => formatTimeString(value, is24h);
  /** "1 pill", "2 pills", "500 mg"; units stored as free text by older versions fall back to the legacy names. */
  const dose = (amount: number, unit: string) =>
    escapeHtml(
      `${formatNumber(amount)} ${i18n.t(`ui.common.units.${unit}`, {
        count: amount,
        defaultValue: i18n.t(`medications.units.${unit}`, { defaultValue: unit }),
      })}`
    );
  const isLate = (log: IntakeLog) =>
    !!log.scheduledTime &&
    (log.actualTime.getTime() - log.scheduledTime.getTime()) / 60_000 > LATE_AFTER_MINUTES;

  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { margin: 16mm 14mm; }
    body {
      font-family: 'Atkinson Hyperlegible Next', 'Atkinson Hyperlegible', -apple-system,
        'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      color: ${PRINT.ink};
      background: ${PRINT.bg};
    }
    .header { padding-bottom: 14px; margin-bottom: 20px; border-bottom: 2px solid ${PRINT.ink}; }
    .title { font-size: 26px; font-weight: 800; letter-spacing: -0.2px; }
    .who { font-size: 18px; font-weight: 700; margin-top: 6px; }
    .meta { font-size: 13px; color: ${PRINT.ink2}; margin-top: 2px; }
    h2 { font-size: 17px; font-weight: 700; color: ${PRINT.ink}; margin-bottom: 8px; }
    .section { margin-bottom: 26px; }
    /* A long journal may run over pages; keep a medicine's heading with its first rows. */
    .medicine h2, .medicine .info, .medicine .stats { page-break-after: avoid; break-after: avoid; }
    .medicine h2 { font-size: 19px; color: ${PRINT.accent}; margin-bottom: 2px; }
    .info { color: ${PRINT.ink2}; margin-bottom: 10px; }
    .info .note { color: ${PRINT.ink}; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    thead { display: table-header-group; }
    th {
      text-align: left;
      font-weight: 700;
      color: ${PRINT.ink};
      background: ${PRINT.field};
      padding: 8px 8px;
      border-bottom: 1.5px solid ${PRINT.line2};
    }
    td { padding: 7px 8px; border-bottom: 1px solid ${PRINT.line}; vertical-align: top; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    .name { font-weight: 700; }
    .muted { color: ${PRINT.ink2}; }
    .taken { color: ${PRINT.doneInk}; font-weight: 700; }
    .skipped { color: ${PRINT.danger}; font-weight: 700; }
    .partial { color: ${PRINT.late}; font-weight: 700; }
    .late {
      display: inline-block;
      margin-left: 6px;
      padding: 0 6px;
      border: 1px solid ${PRINT.late};
      border-radius: 6px;
      color: ${PRINT.late};
      font-size: 11px;
      font-weight: 700;
    }
    .stats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
    .stat { background: ${PRINT.field}; border-radius: 10px; padding: 6px 12px; }
    .stat strong { font-size: 15px; margin-left: 4px; }
    .empty { color: ${PRINT.ink2}; padding: 10px 12px; background: ${PRINT.field}; border-radius: 10px; }
  `;

  const summaryRows = medicationsWithLogs
    .map(
      ({ medication }) => `
        <tr>
          <td class="name">${escapeHtml(medicineDisplayName(medication))}</td>
          <td>${dose(medication.dosageAmount, medication.dosageUnit)}</td>
          <td>${escapeHtml(describeSchedule(medication, timeString))}</td>
          <td class="${medication.isActive ? '' : 'muted'}">${th(
            medication.isActive ? 'export.statusActive' : 'export.statusPaused'
          )}</td>
        </tr>`
    )
    .join('');

  const medicineSections = medicationsWithLogs
    .map(({ medication, logs }) => {
      const total = logs.length;
      const taken = logs.filter((l) => l.action === 'taken').length;
      const skipped = logs.filter((l) => l.action === 'skipped').length;
      const partial = logs.filter((l) => l.action === 'partial').length;
      const late = logs.filter(isLate).length;
      const info = [
        dose(medication.dosageAmount, medication.dosageUnit),
        escapeHtml(describeSchedule(medication, timeString)),
      ];
      if (medication.notes) {
        info.push(`<span class="note">${th('export.notes')}: ${escapeHtml(medication.notes)}</span>`);
      }
      const stat = (label: string, value: string | number) =>
        `<div class="stat">${th(label)}<strong>${escapeHtml(value)}</strong></div>`;

      const body =
        total === 0
          ? `<div class="empty">${th('export.noRecordsFound')}</div>`
          : `
      <div class="stats">
        ${stat('export.totalRecords', total)}
        ${stat('export.taken', taken)}
        ${stat('export.skipped', skipped)}
        ${partial > 0 ? stat('export.partial', partial) : ''}
        ${late > 0 ? stat('export.lateIntakes', late) : ''}
        ${stat('export.adherenceRate', `${Math.round((taken / total) * 100)}%`)}
      </div>
      <table>
        <thead>
          <tr>
            <th>${th('export.scheduledFor')}</th>
            <th>${th('export.actualTime')}</th>
            <th>${th('export.status')}</th>
            <th>${th('export.amount')}</th>
            <th>${th('export.notes')}</th>
          </tr>
        </thead>
        <tbody>${logs
          .map(
            (log) => `
          <tr>
            <td>${log.scheduledTime ? dayTime(log.scheduledTime) : `<span class="muted">${th('export.notScheduled')}</span>`}</td>
            <td>${dayTime(log.actualTime)}${isLate(log) ? `<span class="late">${th('export.late')}</span>` : ''}</td>
            <td class="${escapeHtml(log.action)}">${th(`history.actions.${log.action}`)}</td>
            <td>${dose(log.dosageAmount, medication.dosageUnit)}</td>
            <td>${log.notes ? escapeHtml(log.notes) : '<span class="muted">–</span>'}</td>
          </tr>`
          )
          .join('')}
        </tbody>
      </table>`;

      return `
    <div class="section medicine">
      <h2>${escapeHtml(medicineDisplayName(medication))}</h2>
      <div class="info">${info.join(' · ')}</div>
      ${body}
    </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(getCurrentLocale())}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${css}</style>
</head>
<body>
  <div class="header">
    <div class="title">${th('export.reportTitle')}</div>
    <div class="who">${escapeHtml(profile.name)}</div>
    <div class="meta">${th('export.reportPeriod')}: ${day(startDate)} – ${day(endDate)}</div>
    <div class="meta">${escapeHtml(
      i18n.t('export.madeOn', {
        date: format(now, 'd MMM yyyy', { locale: dateLocale }),
        time: formatTime(now, is24h),
      })
    )}</div>
  </div>

  <div class="section">
    <h2>${th('export.medicationsSummary')}</h2>
    <table>
      <thead>
        <tr>
          <th>${th('export.medicine')}</th>
          <th>${th('export.dosage')}</th>
          <th>${th('export.scheduleType')}</th>
          <th>${th('export.status')}</th>
        </tr>
      </thead>
      <tbody>${summaryRows}
      </tbody>
    </table>
  </div>
${medicineSections}
</body>
</html>
`;
}

/**
 * Generate PDF report and return the file URI
 */
export async function generatePDFReport(profileId: string, days: number = 60): Promise<string> {
  try {
    // Get data
    const data = await getExportData(profileId, days);

    // Generate HTML
    const html = generatePDFHTML(data);

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    return uri;
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw error;
  }
}

/**
 * Share a PDF report
 */
export async function sharePDFReport(uri: string): Promise<void> {
  try {
    if (await Sharing.isAvailableAsync()) {
      await withAutoLockSuspended(() =>
        Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: i18n.t('export.shareReport'),
          UTI: 'com.adobe.pdf',
        })
      );
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Failed to share PDF:', error);
    throw error;
  }
}

/**
 * Save PDF report to device storage
 * Opens the system save dialog where user can choose where to save
 */
export async function savePDFReportLocally(uri: string, profileName: string): Promise<string> {
  try {
    // Create filename with timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
    const filename = `MyMedSchedule_${profileName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`;

    // Create File instance for source
    const sourceFile = new File(uri);

    if (Platform.OS === 'android') {
      // Android: Use directory picker to let user choose save location
      const selectedDirectory = await withAutoLockSuspended(() => Directory.pickDirectoryAsync());

      if (!selectedDirectory) {
        throw new Error(i18n.t('export.permissionDenied'));
      }

      // Read the source file content
      const sourceContent = await sourceFile.bytes();

      // Create a new file in the selected directory
      const destinationFile = selectedDirectory.createFile(filename, 'application/pdf');

      // Write the content to the new file (works with content URIs)
      destinationFile.write(sourceContent);

      return i18n.t('export.savedSuccessfully');
    } else {
      // iOS: Copy to document directory first, then use share sheet
      const destinationFile = new File(Paths.document, filename);
      sourceFile.copy(destinationFile);

      if (await Sharing.isAvailableAsync()) {
        await withAutoLockSuspended(() =>
          Sharing.shareAsync(destinationFile.uri, {
            mimeType: 'application/pdf',
            dialogTitle: i18n.t('export.saveToFiles'),
            UTI: 'com.adobe.pdf',
          })
        );

        return i18n.t('export.savedToFilesApp');
      } else {
        throw new Error('File sharing is not available on this device');
      }
    }
  } catch (error) {
    console.error('Failed to save PDF locally:', error);
    throw error;
  }
}
