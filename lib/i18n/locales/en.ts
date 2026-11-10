export default {
  screens: {
    addMedication: 'Add Medication',
    medicationDetails: 'Medication Details',
    editMedication: 'Edit Medication',
  },

  medications: {
    nameLabel: 'Medication Name',

    // Status
    active: 'Active',
    inactive: 'Inactive',
    status: 'Status',

    scheduleTypes: {
      once_daily: 'Once Daily',
      multiple_daily: 'Multiple Times Daily',
      every_x_days: 'Every X Days',
      specific_weekdays: 'Specific Weekdays',
      xth_weekday: 'Xth Day of Week (Monthly)',
      daily: 'Daily',
      cycle: 'Cycle (X days on, Y days off)',
      every_x_hours: 'Every X Hours',
      tapering: 'Tapering (Gradual Reduction)',
      prn: 'As Needed (PRN)',
    },

    occurrences: {
      first: '1st',
      second: '2nd',
      third: '3rd',
      fourth: '4th',
      last: 'Last',
    },

    weekdays: {
      sunday: 'Sunday',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
    },

    weekdaysShort: {
      sun: 'Sun',
      mon: 'Mon',
      tue: 'Tue',
      wed: 'Wed',
      thu: 'Thu',
      fri: 'Fri',
      sat: 'Sat',
    },

    units: {
      g: 'grams',
      mg: 'milligrams',
      ml: 'milliliters',
      grams: 'g',
      milligrams: 'mg',
      milliliters: 'ml',
      pills: 'pills',
      puffs: 'puffs',
      drops: 'drops',
      patches: 'patches',
      units: 'units',
    },
  },

  history: {
    actions: {
      taken: 'Taken',
      skipped: 'Skipped',
      partial: 'Partial',
    },
  },

  schedule: {
    description: {
      prn: 'As needed (PRN)',
      onceDaily: 'Once daily at {{time}}',
      timesDaily: '{{count}} time daily',
      timesDaily_other: '{{count}} times daily',
      everyXDays: 'Every {{count}} day',
      everyXDays_other: 'Every {{count}} days',
      specificWeekdays: 'On {{days}}',
      xthWeekday: '{{occurrence}} {{weekday}} of month',
      occurrenceNth: '{{n}}th',
      cycle: '{{daysOn}} days on, {{daysOff}} days off',
      everyXHours: 'Every {{count}} hour',
      everyXHours_other: 'Every {{count}} hours',
      tapering:
        'Tapering: Start {{startDose}}, reduce {{decrementAmount}} every {{decrementIntervalDays}} days',
      custom: 'Custom schedule',
      invalid: 'Invalid schedule',
    },
  },

  export: {
    reportTitle: 'Medication Adherence Report',
    profileName: 'Profile',
    reportPeriod: 'Report Period',
    generatedOn: 'Generated on',
    medicationsSummary: 'Medications Summary',
    dosage: 'Dosage',
    scheduleType: 'Schedule',
    asneedmedication: 'As Needed (PRN)',
    notes: 'Notes',
    noRecordsFound: 'No records found for this period',
    scheduledFor: 'Scheduled For',
    actualTime: 'Actual Time',
    status: 'Status',
    amount: 'Amount',
    notScheduled: 'Not Scheduled',
    late: 'LATE',
    totalRecords: 'Total Records',
    taken: 'Taken',
    skipped: 'Skipped',
    partial: 'Partial',
    lateIntakes: 'Late Intakes',
    adherenceRate: 'Adherence Rate',
    shareReport: 'Share Medication Report',
    saveToFiles: 'Save PDF to Files',
    savedToFilesApp: 'Choose "Save to Files" from the menu to save the PDF',
    savedSuccessfully: 'PDF saved successfully',
    permissionDenied: 'Permission denied to save file',
  },

  notifications: {
    medicationReminder: 'Medication Reminder',
    doseReminderBody: 'Time to take {{medication}} - {{amount}} {{unit}}',
    snoozedTitle: 'Medication Reminder (Snoozed)',
    snoozedBody: 'Time to take {{medication}}',
    refillReminderTitle: 'Refill Reminder',
    refillReminderBody: 'Time to refill {{medication}}. You have {{count}} {{unit}} remaining.',
    actions: {
      take: 'Mark as taken',
      snooze15: 'Snooze 15 min',
      skip: 'Skip',
    },
  },
};
