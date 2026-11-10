import en from './en';
import { mergeLocale } from './merge';

const trOverrides = {
  medications: {
    nameLabel: 'İlaç Adı',

    // Status
    inactive: 'Aktif Değil',

    scheduleTypes: {
      once_daily: 'Günde Bir Kez',
      multiple_daily: 'Günde Birden Fazla Kez',
      xth_weekday: "Ayın X'inci Günü (Aylık)",
      cycle: 'Döngü (X gün kullan, Y gün ara)',
      every_x_hours: 'Her X Saatte Bir',
      tapering: 'Azaltma (Kademeli Azalma)',
      prn: 'Gerektiğinde',
      daily: 'Günlük',
      every_x_days: 'X Günde Bir',
      specific_weekdays: 'Belirli Haftanın Günleri',
    },

    weekdays: {
      sunday: 'Pazar',
      monday: 'Pazartesi',
      tuesday: 'Salı',
      wednesday: 'Çarşamba',
      thursday: 'Perşembe',
      friday: 'Cuma',
      saturday: 'Cumartesi',
    },

    occurrences: {
      first: "1'inci",
      second: "2'nci",
      third: "3'üncü",
      fourth: "4'üncü",
      last: 'Son',
    },

    weekdaysShort: {
      sun: 'Paz',
      mon: 'Pzt',
      tue: 'Sal',
      wed: 'Çar',
      thu: 'Per',
      fri: 'Cum',
      sat: 'Cmt',
    },

    units: {
      g: 'gram',
      mg: 'miligram',
      ml: 'mililitre',
      grams: 'g',
      milligrams: 'mg',
      milliliters: 'ml',
      pills: 'hap',
      puffs: 'puf',
      drops: 'damla',
      patches: 'yama',
      units: 'birim',
    },
  },

  schedule: {
    description: {
      prn: 'Gerektiğinde',
      onceDaily: 'Günde bir kez {{time}} saatinde',
      timesDaily: 'Günde {{count}} kez',
      timesDaily_other: 'Günde {{count}} kez',
      everyXDays: '{{count}} günde bir',
      everyXDays_other: '{{count}} günde bir',
      specificWeekdays: '{{days}} günlerinde',
      xthWeekday: 'Her ayın {{occurrence}} {{weekday}} günü',
      occurrenceNth: '{{n}}.',
      cycle: '{{daysOn}} gün kullan, {{daysOff}} gün ara',
      everyXHours: '{{count}} saatte bir',
      everyXHours_other: '{{count}} saatte bir',
      tapering:
        'Azaltma: {{startDose}} ile başla, her {{decrementIntervalDays}} günde bir {{decrementAmount}} azalt',
      custom: 'Özel program',
      invalid: 'Geçersiz program',
    },
  },

  history: {
    actions: {
      taken: 'Alındı',
      skipped: 'Atlandı',
      partial: 'Kısmi',
    },
  },

  notifications: {
    medicationReminder: 'İlaç Hatırlatıcısı',
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

  export: {
    reportTitle: 'İlaç Uyum Raporu',
    profileName: 'Profil',
    reportPeriod: 'Rapor Dönemi',
    generatedOn: 'Oluşturma tarihi',
    medicationsSummary: 'İlaçlar Özeti',
    dosage: 'Doz',
    scheduleType: 'Program',
    asneedmedication: 'Gerektiğinde (PRN)',
    notes: 'Notlar',
    noRecordsFound: 'Bu dönem için kayıt bulunamadı',
    scheduledFor: 'Planlandığı Zaman',
    actualTime: 'Gerçek Zaman',
    status: 'Durum',
    amount: 'Miktar',
    notScheduled: 'Planlanmamış',
    late: 'GEÇ',
    totalRecords: 'Toplam Kayıt',
    taken: 'Alındı',
    skipped: 'Atlandı',
    partial: 'Kısmi',
    lateIntakes: 'Geç Alımlar',
    adherenceRate: 'Uyum Oranı',
    shareReport: 'İlaç Raporunu Paylaş',
    saveToFiles: "PDF'yi Dosyalara Kaydet",
    savedToFilesApp: 'PDF\'yi kaydetmek için menüden "Dosyalara Kaydet" seçeneğini seçin',
    savedSuccessfully: 'PDF başarıyla kaydedildi',
    permissionDenied: 'Dosya kaydetme izni reddedildi',
  },
};

export default mergeLocale(en, trOverrides);
