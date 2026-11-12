import { defineFragment } from './define';

/**
 * Owner: Settings › About and Your data rows, plus their pages: Open-source licences
 * (app/settings/licenses.tsx, app/settings/license/[id].tsx), Contact support
 * (app/settings/support.tsx) and Delete everything (app/settings/delete-data.tsx).
 * Privacy / terms texts live in `ui.legal`.
 */
export default defineFragment({
  en: {
    rows: {
      privacy: 'Your data and privacy',
      terms: 'Terms of use',
      licenses: 'Open-source licences',
      support: 'Contact support',
      website: 'Website',
      madeBy: 'Made by {{name}}',
      deleteAll: 'Delete everything',
      deleteAllSubtitle: 'Remove all data from this phone',
    },
    licenses: {
      title: 'Open-source licences',
      subtitle:
        'MyMedSchedule is built with free, open-source software. Thank you to everyone who made it.',
      search: 'Search',
      searchPlaceholder: 'Search by name or licence',
      nativeHeader: 'Built into the app',
      packagesHeader: {
        one: '{{count}} software package',
        other: '{{count}} software packages',
      },
      empty: 'Nothing found for "{{query}}".',
      by: 'By {{author}}',
      noText: "This package doesn't include its licence text. Licence: {{license}}.",
      projectPage: 'Project page',
      versionLabel: 'Version {{version}}',
      notFound: "Couldn't find this licence.",
    },
    support: {
      title: 'Contact support',
      body: 'Questions, problems or ideas? Send us an email. We usually answer within a few days.',
      emailLabel: 'Email address',
      write: 'Write an email',
      privacyNote:
        "We only see what you put in your email. Your medicines and journal stay on your phone. Please don't include medical details unless you want to.",
      noMailApp: 'No email app found. Write to {{email}} from any email app.',
      selectHint: 'Touch and hold the address to copy it.',
      website: 'Website',
      mail: {
        subject: 'MyMedSchedule support',
        greeting: 'Hello,',
        prompt: '(Write your question here.)',
        noMedical: "Please don't include medical details unless you want to.",
        infoHeader: 'App information (helps us help you):',
        appVersion: 'App version',
        system: 'System',
        device: 'Phone',
        language: 'Language',
      },
    },
    deleteAll: {
      title: 'Delete everything',
      intro: 'This removes everything from this phone:',
      items:
        '• All people and their photos\n• All medicines and their photos\n• The whole journal\n• All reminders\n• Your PIN and the app lock\n• All settings',
      cantUndo:
        "This can't be undone. There is no backup, so nobody can bring it back, including us.",
      exportedNote: 'Reports you saved to a folder or shared earlier are not touched.',
      exportTitle: 'Want to keep a record?',
      exportBody: 'Export a report first. You can share it with your doctor or keep it.',
      exportFirst: 'Export a report first',
      action: 'Delete everything',
      confirmTitle: 'Delete everything?',
      confirmMessage:
        "All people, medicines, the journal, reminders and settings will be removed from this phone. This can't be undone.",
      confirmAction: 'Yes, delete everything',
      identityPrompt: "Confirm it's you",
      identityFailed: "Couldn't confirm it's you. Nothing was deleted.",
      pinTitle: 'Enter your PIN',
      pinSubtitle: 'To delete everything',
      deleting: 'Deleting everything…',
      done: 'Everything has been deleted',
      partial: 'Some files could not be removed. To be sure they are gone, uninstall the app.',
      restartNeeded: 'Almost done. The app restarts to finish.',
      failed: "Couldn't delete everything. Close the app, open it again and try once more.",
    },
  },
  nl: {
    rows: {
      privacy: 'Je gegevens en privacy',
      terms: 'Gebruiksvoorwaarden',
      licenses: 'Opensourcelicenties',
      support: 'Contact opnemen',
      website: 'Website',
      madeBy: 'Gemaakt door {{name}}',
      deleteAll: 'Alles verwijderen',
      deleteAllSubtitle: 'Wis alle gegevens van deze telefoon',
    },
    licenses: {
      title: 'Opensourcelicenties',
      subtitle:
        'MyMedSchedule is gemaakt met gratis opensourcesoftware. Dank aan iedereen die eraan meewerkte.',
      search: 'Zoeken',
      searchPlaceholder: 'Zoek op naam of licentie',
      nativeHeader: 'Ingebouwd in de app',
      packagesHeader: {
        one: '{{count}} softwarepakket',
        other: '{{count}} softwarepakketten',
      },
      empty: 'Niets gevonden voor "{{query}}".',
      by: 'Door {{author}}',
      noText: 'Dit pakket bevat zijn licentietekst niet. Licentie: {{license}}.',
      projectPage: 'Projectpagina',
      versionLabel: 'Versie {{version}}',
      notFound: 'Deze licentie is niet gevonden.',
    },
    support: {
      title: 'Contact opnemen',
      body: 'Vragen, problemen of ideeën? Stuur ons een mail. We antwoorden meestal binnen een paar dagen.',
      emailLabel: 'E-mailadres',
      write: 'Mail schrijven',
      privacyNote:
        'We zien alleen wat je in je mail zet. Je medicijnen en dagboek blijven op je telefoon. Zet er liever geen medische gegevens in, tenzij je dat zelf wilt.',
      noMailApp: 'Geen mail-app gevonden. Schrijf naar {{email}} vanuit een mail-app naar keuze.',
      selectHint: 'Houd het adres ingedrukt om het te kopiëren.',
      website: 'Website',
      mail: {
        subject: 'MyMedSchedule support',
        greeting: 'Hallo,',
        prompt: '(Schrijf hier je vraag.)',
        noMedical: 'Zet er liever geen medische gegevens in, tenzij je dat zelf wilt.',
        infoHeader: 'Informatie over de app (zo kunnen we je beter helpen):',
        appVersion: 'App-versie',
        system: 'Systeem',
        device: 'Telefoon',
        language: 'Taal',
      },
    },
    deleteAll: {
      title: 'Alles verwijderen',
      intro: 'Dit wist alles van deze telefoon:',
      items:
        "• Alle personen en hun foto's\n• Alle medicijnen en hun foto's\n• Het hele dagboek\n• Alle herinneringen\n• Je pincode en de app-vergrendeling\n• Alle instellingen",
      cantUndo:
        'Dit kan niet ongedaan worden gemaakt. Er is geen back-up, dus niemand kan het terughalen, ook wij niet.',
      exportedNote: 'Rapporten die je eerder in een map hebt bewaard of gedeeld, blijven bestaan.',
      exportTitle: 'Wil je iets bewaren?',
      exportBody: 'Exporteer eerst een rapport. Je kunt het delen met je arts of zelf bewaren.',
      exportFirst: 'Eerst een rapport exporteren',
      action: 'Alles verwijderen',
      confirmTitle: 'Alles verwijderen?',
      confirmMessage:
        'Alle personen, medicijnen, het dagboek, herinneringen en instellingen worden van deze telefoon gewist. Dit kan niet ongedaan worden gemaakt.',
      confirmAction: 'Ja, alles verwijderen',
      identityPrompt: 'Bevestig dat jij het bent',
      identityFailed: 'Kon niet bevestigen dat jij het bent. Er is niets verwijderd.',
      pinTitle: 'Voer je pincode in',
      pinSubtitle: 'Om alles te verwijderen',
      deleting: 'Alles wordt verwijderd…',
      done: 'Alles is verwijderd',
      partial:
        'Sommige bestanden konden niet worden gewist. Verwijder de app om zeker te zijn dat ze weg zijn.',
      restartNeeded: 'Bijna klaar. De app start opnieuw om af te ronden.',
      failed:
        'Niet alles kon worden verwijderd. Sluit de app, open hem opnieuw en probeer het nog eens.',
    },
  },
  tr: {
    rows: {
      privacy: 'Verileriniz ve gizlilik',
      terms: 'Kullanım koşulları',
      licenses: 'Açık kaynak lisansları',
      support: 'Destek ile iletişim',
      website: 'Web sitesi',
      madeBy: '{{name}} tarafından yapıldı',
      deleteAll: 'Her şeyi sil',
      deleteAllSubtitle: 'Bu telefondaki tüm verileri kaldırın',
    },
    licenses: {
      title: 'Açık kaynak lisansları',
      subtitle:
        'MyMedSchedule ücretsiz, açık kaynak yazılımlarla geliştirildi. Emeği geçen herkese teşekkürler.',
      search: 'Ara',
      searchPlaceholder: 'Ada veya lisansa göre arayın',
      nativeHeader: 'Uygulamaya yerleşik',
      packagesHeader: {
        one: '{{count}} yazılım paketi',
        other: '{{count}} yazılım paketi',
      },
      empty: '"{{query}}" için sonuç bulunamadı.',
      by: 'Geliştiren: {{author}}',
      noText: 'Bu paket lisans metnini içermiyor. Lisans: {{license}}.',
      projectPage: 'Proje sayfası',
      versionLabel: 'Sürüm {{version}}',
      notFound: 'Bu lisans bulunamadı.',
    },
    support: {
      title: 'Destek ile iletişim',
      body: 'Sorunuz, sorununuz veya fikriniz mi var? Bize e-posta gönderin. Genellikle birkaç gün içinde yanıt veririz.',
      emailLabel: 'E-posta adresi',
      write: 'E-posta yazın',
      privacyNote:
        'Yalnızca e-postanıza yazdıklarınızı görürüz. İlaçlarınız ve günlüğünüz telefonunuzda kalır. İstemediğiniz sürece sağlık bilgilerinizi eklemeyin.',
      noMailApp:
        'E-posta uygulaması bulunamadı. Herhangi bir e-posta uygulamasından {{email}} adresine yazın.',
      selectHint: 'Kopyalamak için adrese basılı tutun.',
      website: 'Web sitesi',
      mail: {
        subject: 'MyMedSchedule destek',
        greeting: 'Merhaba,',
        prompt: '(Sorunuzu buraya yazın.)',
        noMedical: 'İstemediğiniz sürece sağlık bilgilerinizi eklemeyin.',
        infoHeader: 'Uygulama bilgileri (size daha iyi yardımcı olmamızı sağlar):',
        appVersion: 'Uygulama sürümü',
        system: 'Sistem',
        device: 'Telefon',
        language: 'Dil',
      },
    },
    deleteAll: {
      title: 'Her şeyi sil',
      intro: 'Bu işlem bu telefondaki her şeyi kaldırır:',
      items:
        '• Tüm kişiler ve fotoğrafları\n• Tüm ilaçlar ve fotoğrafları\n• Günlüğün tamamı\n• Tüm hatırlatıcılar\n• PIN kodunuz ve uygulama kilidi\n• Tüm ayarlar',
      cantUndo:
        'Bu işlem geri alınamaz. Yedek olmadığı için biz dahil kimse verileri geri getiremez.',
      exportedNote: 'Daha önce bir klasöre kaydettiğiniz veya paylaştığınız raporlar silinmez.',
      exportTitle: 'Bir kayıt saklamak ister misiniz?',
      exportBody:
        'Önce bir rapor dışa aktarın. Raporu doktorunuzla paylaşabilir veya saklayabilirsiniz.',
      exportFirst: 'Önce rapor dışa aktar',
      action: 'Her şeyi sil',
      confirmTitle: 'Her şey silinsin mi?',
      confirmMessage:
        'Tüm kişiler, ilaçlar, günlük, hatırlatıcılar ve ayarlar bu telefondan kaldırılacak. Bu işlem geri alınamaz.',
      confirmAction: 'Evet, her şeyi sil',
      identityPrompt: 'Siz olduğunuzu doğrulayın',
      identityFailed: 'Siz olduğunuz doğrulanamadı. Hiçbir şey silinmedi.',
      pinTitle: 'PIN kodunuzu girin',
      pinSubtitle: 'Her şeyi silmek için',
      deleting: 'Her şey siliniyor…',
      done: 'Her şey silindi',
      partial:
        'Bazı dosyalar kaldırılamadı. Tamamen silindiklerinden emin olmak için uygulamayı kaldırın.',
      restartNeeded: 'Neredeyse bitti. Tamamlamak için uygulama yeniden başlıyor.',
      failed: 'Her şey silinemedi. Uygulamayı kapatıp yeniden açın ve bir kez daha deneyin.',
    },
  },
});
