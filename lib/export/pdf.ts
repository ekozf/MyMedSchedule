import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Directory, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { format, subDays } from 'date-fns';
import { getDatabase } from '@/lib/db';
import { intakeLogs, medications, profiles } from '@/lib/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import type { IntakeLog, Medication, Profile } from '@/types';
import i18n from '@/lib/i18n';

// Helper to convert null to undefined
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

interface MedicationWithLogs {
  medication: Medication;
  logs: IntakeLog[];
}

interface ExportData {
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
      imageUri: nullToUndefined(med.imageUri),
      notes: nullToUndefined(med.notes),
      dosageAmount: med.dosageAmount,
      dosageUnit: med.dosageUnit as any,
      scheduleType: med.scheduleType as any,
      scheduleConfig: med.scheduleConfig,
      inventoryCount: med.inventoryCount || 0,
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

/**
 * Generate HTML for the PDF report
 */
function generatePDFHTML(data: ExportData): string {
  const { profile, medicationsWithLogs, startDate, endDate } = data;

  // Helper to format dates
  const formatDate = (date: Date) => {
    return format(date, 'PPpp');
  };

  const formatDateOnly = (date: Date) => {
    return format(date, 'PP');
  };

  // Helper to get action text
  const getActionText = (action: 'taken' | 'skipped' | 'partial') => {
    return i18n.t(`history.actions.${action}`);
  };

  // Get dosage unit text
  const getDosageUnitText = (unit: string) => {
    return i18n.t(`medications.units.${unit}`);
  };

  // Get schedule type text
  const getScheduleTypeText = (scheduleType: string) => {
    if (scheduleType === 'prn') {
      return i18n.t('export.asneedmedication');
    }
    return i18n.t(`medications.scheduleTypes.${scheduleType}`);
  };

  // Build HTML
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 10px;
      line-height: 1.4;
      color: #1a1a1a;
      padding: 20px;
    }
    
    .header {
      margin-bottom: 15px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 10px;
    }
    
    .title {
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 5px;
    }
    
    .subtitle {
      font-size: 11px;
      color: #666;
      margin-bottom: 3px;
    }
    
    .section {
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 13px;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 6px;
      padding: 4px 6px;
      background-color: #f3f4f6;
      border-left: 3px solid #2563eb;
    }
    
    .medication-header {
      font-size: 12px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 4px;
      padding: 3px 5px;
      background-color: #eff6ff;
    }
    
    .medication-info {
      font-size: 9px;
      color: #555;
      margin-bottom: 4px;
      padding-left: 5px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 8px;
    }
    
    th {
      background-color: #f9fafb;
      font-weight: 600;
      text-align: left;
      padding: 4px 3px;
      border-bottom: 2px solid #e5e7eb;
      font-size: 8px;
    }
    
    td {
      padding: 3px 3px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }
    
    tr:hover {
      background-color: #fafafa;
    }
    
    .status-taken {
      color: #16a34a;
      font-weight: 600;
    }
    
    .status-skipped {
      color: #dc2626;
      font-weight: 600;
    }
    
    .status-partial {
      color: #ea580c;
      font-weight: 600;
    }
    
    .status-active {
      color: #16a34a;
      font-weight: 600;
    }
    
    .status-inactive {
      color: #6b7280;
      font-style: italic;
    }
    
    .medications-summary-table {
      background-color: #f9fafb;
      margin-bottom: 15px;
    }
    
    .medications-summary-table th {
      background-color: #e5e7eb;
      font-weight: 700;
      font-size: 9px;
    }
    
    .medications-summary-table td {
      padding: 5px 3px;
      font-size: 9px;
    }
    
    .late-badge {
      background-color: #fef3c7;
      color: #92400e;
      padding: 1px 3px;
      border-radius: 2px;
      font-size: 7px;
      font-weight: 600;
      margin-left: 3px;
    }
    
    .notes {
      font-style: italic;
      color: #666;
      font-size: 8px;
      max-width: 200px;
    }
    
    .summary {
      background-color: #f9fafb;
      padding: 8px;
      border-radius: 4px;
      margin-top: 8px;
      font-size: 9px;
    }
    
    .summary-item {
      margin-bottom: 3px;
    }
    
    .summary-label {
      font-weight: 600;
      color: #374151;
    }
    
    .no-logs {
      padding: 8px;
      text-align: center;
      color: #9ca3af;
      font-style: italic;
      font-size: 9px;
    }
    
    @media print {
      body {
        padding: 10px;
      }
      
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${i18n.t('export.reportTitle')}</div>
    <div class="subtitle">${i18n.t('export.profileName')}: ${profile.name}</div>
    <div class="subtitle">${i18n.t('export.reportPeriod')}: ${formatDateOnly(startDate)} - ${formatDateOnly(endDate)}</div>
    <div class="subtitle">${i18n.t('export.generatedOn')}: ${formatDate(new Date())}</div>
  </div>
  
  <div class="section">
    <div class="section-title">${i18n.t('export.medicationsSummary')}</div>
    <table class="medications-summary-table">
      <thead>
        <tr>
          <th>${i18n.t('medications.nameLabel')}</th>
          <th>${i18n.t('export.dosage')}</th>
          <th>${i18n.t('export.scheduleType')}</th>
          <th>${i18n.t('medications.status')}</th>
        </tr>
      </thead>
      <tbody>
`;

  // Add each medication to the summary table
  medicationsWithLogs.forEach(({ medication }) => {
    const statusText = medication.isActive 
      ? i18n.t('medications.active') 
      : i18n.t('medications.inactive');
    const statusClass = medication.isActive ? 'status-active' : 'status-inactive';
    
    html += `
        <tr>
          <td><strong>${medication.name}</strong></td>
          <td>${medication.dosageAmount} ${getDosageUnitText(medication.dosageUnit)}</td>
          <td>${getScheduleTypeText(medication.scheduleType)}</td>
          <td class="${statusClass}">${statusText}</td>
        </tr>
`;
  });

  html += `
      </tbody>
    </table>
  </div>
`;

  // Add each medication and its logs
  medicationsWithLogs.forEach(({ medication, logs }) => {
    const totalLogs = logs.length;
    const takenLogs = logs.filter((l) => l.action === 'taken').length;
    const skippedLogs = logs.filter((l) => l.action === 'skipped').length;
    const partialLogs = logs.filter((l) => l.action === 'partial').length;
    const lateLogs = logs.filter((l) => {
      if (!l.scheduledTime) return false;
      const diffMs = l.actualTime.getTime() - l.scheduledTime.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      return diffMinutes > 30;
    }).length;

    html += `
  <div class="section">
    <div class="medication-header">${medication.name}</div>
    <div class="medication-info">
      ${i18n.t('export.dosage')}: ${medication.dosageAmount} ${getDosageUnitText(medication.dosageUnit)}
      ${medication.scheduleType !== 'prn' ? ` | ${i18n.t('export.scheduleType')}: ${i18n.t(`medications.scheduleTypes.${medication.scheduleType}`)}` : ` | ${i18n.t('export.asneedmedication')}`}
      ${medication.notes ? ` | ${i18n.t('export.notes')}: ${medication.notes}` : ''}
    </div>
`;

    if (logs.length === 0) {
      html += `    <div class="no-logs">${i18n.t('export.noRecordsFound')}</div>`;
    } else {
      html += `
    <table>
      <thead>
        <tr>
          <th>${i18n.t('export.scheduledFor')}</th>
          <th>${i18n.t('export.actualTime')}</th>
          <th>${i18n.t('export.status')}</th>
          <th>${i18n.t('export.amount')}</th>
          <th>${i18n.t('export.notes')}</th>
        </tr>
      </thead>
      <tbody>
`;

      logs.forEach((log) => {
        const isLate =
          log.scheduledTime &&
          (log.actualTime.getTime() - log.scheduledTime.getTime()) / (1000 * 60) > 30;

        const statusClass = `status-${log.action}`;

        html += `
        <tr>
          <td>${log.scheduledTime ? formatDate(log.scheduledTime) : i18n.t('export.notScheduled')}</td>
          <td>${formatDate(log.actualTime)}${isLate ? `<span class="late-badge">${i18n.t('export.late')}</span>` : ''}</td>
          <td class="${statusClass}">${getActionText(log.action)}</td>
          <td>${log.dosageAmount} ${getDosageUnitText(medication.dosageUnit)}</td>
          <td class="notes">${log.notes || '-'}</td>
        </tr>
`;
      });

      html += `
      </tbody>
    </table>
    
    <div class="summary">
      <div class="summary-item">
        <span class="summary-label">${i18n.t('export.totalRecords')}:</span> ${totalLogs}
      </div>
      <div class="summary-item">
        <span class="summary-label status-taken">${i18n.t('export.taken')}:</span> ${takenLogs}
      </div>
      <div class="summary-item">
        <span class="summary-label status-skipped">${i18n.t('export.skipped')}:</span> ${skippedLogs}
      </div>
      ${partialLogs > 0 ? `<div class="summary-item"><span class="summary-label status-partial">${i18n.t('export.partial')}:</span> ${partialLogs}</div>` : ''}
      ${lateLogs > 0 ? `<div class="summary-item"><span class="summary-label">${i18n.t('export.lateIntakes')}:</span> ${lateLogs}</div>` : ''}
      ${takenLogs > 0 ? `<div class="summary-item"><span class="summary-label">${i18n.t('export.adherenceRate')}:</span> ${((takenLogs / totalLogs) * 100).toFixed(1)}%</div>` : ''}
    </div>
`;
    }

    html += `  </div>\n`;
  });

  html += `
</body>
</html>
`;

  return html;
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
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: i18n.t('export.shareReport'),
        UTI: 'com.adobe.pdf',
      });
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
      const selectedDirectory = await Directory.pickDirectoryAsync();

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
        await Sharing.shareAsync(destinationFile.uri, {
          mimeType: 'application/pdf',
          dialogTitle: i18n.t('export.saveToFiles'),
          UTI: 'com.adobe.pdf',
        });

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
