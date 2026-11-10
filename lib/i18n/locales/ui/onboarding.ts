import { defineFragment } from './define';

/**
 * Owner: Onboarding, lock screen, launch/loading and not-found ("Pill Box" spec §5.1).
 * Add keys to `en` (complete) and translate in `nl` / `tr`.
 * Use as `i18n.t('ui.onboarding.<key>')`.
 *
 * `disclaimer.pages` is the legal copy of the old disclaimer (legacy `disclaimer.*` keys), split
 * one topic per page and tightened. Every point of the old text is still in it:
 * privacy: no data collection, fully local / no cloud or backup, encrypted on device, export is
 * unencrypted, loss of phone or app = data gone. medical: no advice or diagnosis, no instructions,
 * no interaction / overdose check, not responsible, digital version of a paper diary.
 * technical: phone time and time zones, battery optimisation, manual clock changes.
 * responsibility ("Check your entries"): reminder tool, your entries are your own choice, entry
 * mistakes are not checked by the app, no guarantees, exported reports are unencrypted.
 */
export default defineFragment({
  en: {
    appName: 'MyMedSchedule',
    languages: {
      en: 'English',
      tr: 'Türkçe',
      nl: 'Nederlands',
    },
    /** A language's name in the current language ("Dutch"), shown under its own name. */
    languagesLocal: {
      en: 'English',
      tr: 'Turkish',
      nl: 'Dutch',
    },
    welcome: {
      title: 'Like your pill box, but it reminds you.',
      body: "Morning, midday, evening, night. Tap when you've taken it. Everything stays on this phone.",
      pictureA11y:
        'A pill box with four compartments: morning is done, midday is the one to open now, evening is still to come and night is empty.',
      getStarted: 'Get started',
      example: 'Example',
      languageTitle: 'Language',
      languageSubtitle: 'The app switches right away.',
      languageA11y: 'Language: {{language}}. Double tap to change.',
    },
    disclaimer: {
      title: 'Good to know',
      viewSubtitle: 'What you agreed to when you started.',
      fullSubtitle: 'The full text of what you agree to.',
      consentTitle: 'Before you start',
      readFull: 'Read the full text',
      agree: 'I understand and agree',
      continue: 'Continue',
      pages: {
        privacy: {
          title: 'Your data stays on this phone',
          summary:
            'Nothing is collected or backed up. If you lose the phone or delete the app, your data is gone.',
          p1: "We don't collect any data. Nothing at all. The app works only on this phone: there is no account, no cloud and no online backup.",
          p2: 'What you enter is stored encrypted on this phone. Nobody else can read it without your phone, and your PIN if you set one.',
          p3: "A report you export is not encrypted. Keeping it safe is up to you. If you lose your phone or delete the app, your data is gone for good and we can't get it back. Export a report now and then if you want a copy on paper.",
        },
        medical: {
          title: 'A reminder, not a doctor',
          summary:
            "It doesn't give medical advice or check your medicines for interactions or overdose.",
          p1: "This app doesn't give medical advice and doesn't diagnose anything. It is a digital version of the paper calendar or diary you would otherwise use to keep track of your medicines.",
          p2: "It doesn't tell you what to take or when. It only reminds you of what you decided to put in yourself. It doesn't check for interactions between medicines or for overdose risks.",
          p3: "We are not responsible for any medicine you do or don't take.",
        },
        technical: {
          title: 'Reminders depend on your phone',
          summary: "Your phone's clock and battery settings can delay or stop a reminder.",
          p1: "Reminders follow your phone's clock. If you travel to another time zone, they follow the time on your phone. Changing the time or date by hand can make reminders come early, late or not at all.",
          p2: 'Battery-saving settings on Android and iPhone can delay or block reminders. Allowing this app in your battery settings is up to you.',
        },
        responsibility: {
          title: 'Check your entries',
          summary:
            'The app follows what you type. Check each medicine against its label or prescription.',
          p1: 'This is a reminder tool. What you enter and mark as taken is yours to decide, and the app follows what you put in.',
          p2: "The app doesn't check your entries for mistakes, so look over what you type, just as you would on paper. The app comes without guarantees.",
          p3: 'Reports you export are not encrypted. Where you keep them and who you send them to is up to you.',
        },
      },
    },
    protect: {
      title: 'Keep it private',
      body: 'Lock the app so only you can open it.',
      reconfigureTitle: 'App lock',
      reconfigureBody: 'Choose how you open the app.',
      recommended: 'Recommended',
      current: 'Current',
      pinTitle: 'PIN code',
      pinDescription: '4 to 6 digits only you know',
      pinNoRecovery:
        'If you choose a PIN and forget it, there is no way back in: everything in the app would be lost. Export a report now and then if you want a copy on paper.',
      usePinCode: 'Use a PIN code',
      useBiometric: 'Use fingerprint or face',
      startAgain: "They didn't match. Let's start again.",
      pinChangeDescription: 'Tap to choose a new PIN',
      biometricTitle: 'Fingerprint or face',
      biometricDescription: 'Uses what your phone already has',
      noLockTitle: 'No lock',
      noLockDescription: 'Anyone with this phone can open the app',
      dontLock: "Don't lock the app",
      choosePin: 'Choose a PIN',
      choosePinHint: '4 to 6 digits.',
      repeatPin: 'Repeat your PIN',
      repeatPinHint: 'Type the same digits again.',
      mismatch: "They don't match. Try again.",
      mismatchAgain: "They didn't match. Type the first PIN again.",
      chooseDifferent: 'Choose a different PIN',
      tooShort: 'Use 4 to 6 digits.',
      next: 'Next',
      biometricFailed: "{{method}} wasn't turned on. Try again, or choose a PIN.",
      pinFailed: "Couldn't save your PIN. Try again.",
      turnOffTitle: 'Turn off the lock?',
      turnOffMessage:
        'Anyone who picks up this phone will be able to open the app and see your medicines.',
      turnOff: 'Turn off the lock',
      verifyTitle: "First, confirm it's you",
      verifyPinHint: 'Enter your current PIN.',
      verifyBiometricHint: 'Use {{method}} to continue.',
      verifyWith: 'Confirm with {{method}}',
      usePin: 'Use PIN instead',
      saveFailed: "Couldn't change the lock. Try again.",
      toast: {
        biometric: '{{method}} is on',
        pin: 'Your PIN is set',
        off: 'The lock is off',
      },
    },
    profile: {
      title: 'What should we call you?',
      nameLabel: 'Your name',
      hint: 'Just a first name is fine. You can add family members later.',
      start: 'Continue',
      nameRequired: 'Type a name to continue.',
      createError: "Couldn't create your profile. Try again.",
    },
    lock: {
      welcomeBack: 'Welcome back',
      welcomeBackName: 'Welcome back, {{name}}',
      pinHint: 'Enter your PIN to open the app.',
      biometricHint: 'Use {{method}} to open the app.',
      biometricPrompt: 'Open {{appName}}',
      unlockWith: 'Open with {{method}}',
      usePin: 'Use PIN instead',
      open: 'Open',
      wrongPin: "That's not it. Try again.",
      forgot: 'Forgot your PIN?',
      forgotTitle: 'Forgot your PIN?',
      forgotP1:
        "There's no way to recover a forgotten PIN. It never leaves this phone, so nobody, including us, can look it up or reset it for you.",
      forgotP2:
        'Take your time and try again. After a few wrong tries the app asks you to wait a moment before the next one.',
      forgotBiometric: 'If you set up {{method}}, you can use that to open the app instead.',
      forgotP3:
        'If you forget your PIN there is no way back in: everything in the app would be lost. The only way to start over is to uninstall the app and set it up again. A report you exported earlier is not affected.',
      forgotClose: 'Try again',
      forgotConsequence:
        "A forgotten PIN can't be recovered or reset, by you or by us, so without it everything in the app is lost.",
      forgotWhatToDo:
        'Take your time and try again; if it really is gone, uninstall the app and set it up again.',
      cooldown: {
        one: 'Too many tries. Try again in {{count}} second.',
        other: 'Too many tries. Try again in {{count}} seconds.',
      },
      biometricFailed: "Couldn't confirm it's you. Try again.",
      passcodeFailed: "Couldn't open with your phone passcode. Try again.",
      biometricLockedOut: '{{method}} is paused. Unlock your phone once, then try again.',
      biometricUnavailable: '{{method}} is not available right now. Use your PIN.',
    },
    biometric: {
      faceId: 'Face ID',
      faceUnlock: 'Face unlock',
      fingerprint: 'Fingerprint',
      iris: 'Iris',
      generic: 'Fingerprint or face',
      passcode: 'your phone passcode',
      /** Short labels for the quiet PinPad key. */
      use: {
        faceId: 'Use Face ID',
        faceUnlock: 'Use face',
        fingerprint: 'Use fingerprint',
        iris: 'Use iris',
        generic: 'Use fingerprint',
        passcode: 'Use passcode',
      },
    },
    loading: {
      a11y: 'Opening {{appName}}',
    },
    notFound: {
      screenTitle: 'Not found',
      title: "This page doesn't exist",
      message: "It may have moved. Let's take you back.",
      action: 'Go to Today',
    },
  },
  nl: {
    languagesLocal: {
      en: 'Engels',
      tr: 'Turks',
      nl: 'Nederlands',
    },
    welcome: {
      title: 'Zoals je pillendoos, maar hij herinnert je eraan.',
      body: 'Ochtend, middag, avond, nacht. Tik als je het hebt ingenomen. Alles blijft op deze telefoon.',
      pictureA11y:
        'Een pillendoos met vier vakjes: de ochtend is klaar, de middag is nu aan de beurt, de avond komt nog en de nacht is leeg.',
      getStarted: 'Aan de slag',
      example: 'Voorbeeld',
      languageTitle: 'Taal',
      languageSubtitle: 'De app wisselt meteen.',
      languageA11y: 'Taal: {{language}}. Dubbeltik om te wijzigen.',
    },
    disclaimer: {
      title: 'Goed om te weten',
      viewSubtitle: 'Waarmee je akkoord ging toen je begon.',
      fullSubtitle: 'De volledige tekst waarmee je akkoord gaat.',
      consentTitle: 'Voordat je begint',
      readFull: 'Lees de volledige tekst',
      agree: 'Ik begrijp het en ga akkoord',
      continue: 'Doorgaan',
      pages: {
        privacy: {
          title: 'Je gegevens blijven op deze telefoon',
          summary:
            'Er wordt niets verzameld of geback-upt. Raak je de telefoon kwijt of verwijder je de app, dan zijn je gegevens weg.',
          p1: 'We verzamelen geen gegevens. Helemaal niets. De app werkt alleen op deze telefoon: er is geen account, geen cloud en geen online back-up.',
          p2: 'Wat je invoert wordt versleuteld op deze telefoon bewaard. Niemand anders kan het lezen zonder je telefoon, en je pincode als je er een hebt ingesteld.',
          p3: 'Een rapport dat je exporteert is niet versleuteld. Het veilig bewaren is jouw verantwoordelijkheid. Raak je je telefoon kwijt of verwijder je de app, dan zijn je gegevens voorgoed weg en kunnen wij ze niet terughalen. Exporteer af en toe een rapport als je een kopie op papier wilt.',
        },
        medical: {
          title: 'Een herinnering, geen dokter',
          summary:
            'De app geeft geen medisch advies en controleert je medicijnen niet op wisselwerkingen of overdosis.',
          p1: 'Deze app geeft geen medisch advies en stelt geen diagnoses. Het is een digitale versie van de papieren kalender of het dagboek waarmee je anders je medicijnen bijhoudt.',
          p2: 'De app vertelt je niet wat of wanneer je iets moet innemen. Hij herinnert je alleen aan wat je er zelf in hebt gezet. Er wordt niet gecontroleerd op wisselwerkingen tussen medicijnen of op het risico van een overdosis.',
          p3: 'Wij zijn niet verantwoordelijk voor medicijnen die je wel of niet inneemt.',
        },
        technical: {
          title: 'Herinneringen hangen af van je telefoon',
          summary:
            'De klok en batterij-instellingen van je telefoon kunnen een herinnering vertragen of tegenhouden.',
          p1: 'Herinneringen volgen de klok van je telefoon. Reis je naar een andere tijdzone, dan volgen ze de tijd op je telefoon. Als je de tijd of datum zelf verandert, kunnen herinneringen te vroeg, te laat of helemaal niet komen.',
          p2: 'Instellingen om batterij te sparen op Android en iPhone kunnen herinneringen vertragen of tegenhouden. Deze app toestaan in je batterij-instellingen is jouw verantwoordelijkheid.',
        },
        responsibility: {
          title: 'Controleer wat je invoert',
          summary: 'De app volgt wat je typt. Vergelijk elk medicijn met het etiket of het recept.',
          p1: 'Dit is een hulpmiddel om je te herinneren. Wat je invoert en als ingenomen markeert, bepaal je zelf. De app volgt wat jij erin zet.',
          p2: 'De app controleert je invoer niet op fouten, dus kijk na wat je typt, net als op papier. De app wordt geleverd zonder garanties.',
          p3: 'Rapporten die je exporteert zijn niet versleuteld. Waar je ze bewaart en naar wie je ze stuurt, bepaal je zelf.',
        },
      },
    },
    protect: {
      title: 'Houd het privé',
      body: 'Vergrendel de app zodat alleen jij hem kunt openen.',
      reconfigureTitle: 'App-vergrendeling',
      reconfigureBody: 'Kies hoe je de app opent.',
      recommended: 'Aanbevolen',
      current: 'Huidig',
      pinTitle: 'Pincode',
      pinDescription: '4 tot 6 cijfers die alleen jij kent',
      pinNoRecovery:
        'Als je een pincode kiest en die vergeet, kom je er niet meer in: alles in de app gaat dan verloren. Exporteer af en toe een rapport als je een kopie op papier wilt.',
      usePinCode: 'Een pincode gebruiken',
      useBiometric: 'Vingerafdruk of gezicht gebruiken',
      startAgain: 'Ze kwamen niet overeen. We beginnen opnieuw.',
      pinChangeDescription: 'Tik om een nieuwe pincode te kiezen',
      biometricTitle: 'Vingerafdruk of gezicht',
      biometricDescription: 'Gebruikt wat je telefoon al heeft',
      noLockTitle: 'Geen vergrendeling',
      noLockDescription: 'Iedereen met deze telefoon kan de app openen',
      dontLock: 'De app niet vergrendelen',
      choosePin: 'Kies een pincode',
      choosePinHint: '4 tot 6 cijfers.',
      repeatPin: 'Herhaal je pincode',
      repeatPinHint: 'Typ dezelfde cijfers nog een keer.',
      mismatch: 'Ze komen niet overeen. Probeer het opnieuw.',
      mismatchAgain: 'Ze kwamen niet overeen. Typ de eerste pincode nog een keer.',
      chooseDifferent: 'Een andere pincode kiezen',
      tooShort: 'Gebruik 4 tot 6 cijfers.',
      next: 'Volgende',
      biometricFailed: '{{method}} is niet aangezet. Probeer het opnieuw of kies een pincode.',
      pinFailed: 'Je pincode kon niet worden bewaard. Probeer het opnieuw.',
      turnOffTitle: 'Vergrendeling uitzetten?',
      turnOffMessage:
        'Iedereen die deze telefoon oppakt, kan dan de app openen en je medicijnen zien.',
      turnOff: 'Vergrendeling uitzetten',
      verifyTitle: 'Eerst even bevestigen dat jij het bent',
      verifyPinHint: 'Voer je huidige pincode in.',
      verifyBiometricHint: 'Gebruik {{method}} om verder te gaan.',
      verifyWith: 'Bevestig met {{method}}',
      usePin: 'Pincode gebruiken',
      saveFailed: 'De vergrendeling kon niet worden gewijzigd. Probeer het opnieuw.',
      toast: {
        biometric: '{{method}} staat aan',
        pin: 'Je pincode is ingesteld',
        off: 'De vergrendeling staat uit',
      },
    },
    profile: {
      title: 'Hoe mogen we je noemen?',
      nameLabel: 'Je naam',
      hint: 'Alleen een voornaam is prima. Je kunt later gezinsleden toevoegen.',
      start: 'Doorgaan',
      nameRequired: 'Typ een naam om verder te gaan.',
      createError: 'Je profiel kon niet worden gemaakt. Probeer het opnieuw.',
    },
    lock: {
      welcomeBack: 'Welkom terug',
      welcomeBackName: 'Welkom terug, {{name}}',
      pinHint: 'Voer je pincode in om de app te openen.',
      biometricHint: 'Gebruik {{method}} om de app te openen.',
      biometricPrompt: '{{appName}} openen',
      unlockWith: 'Openen met {{method}}',
      usePin: 'Pincode gebruiken',
      open: 'Openen',
      wrongPin: 'Dat klopt niet. Probeer het opnieuw.',
      forgot: 'PIN vergeten?',
      forgotTitle: 'PIN vergeten?',
      forgotP1:
        'Een vergeten PIN kan niet worden teruggehaald. Hij verlaat deze telefoon nooit, dus niemand, ook wij niet, kan hem opzoeken of voor je resetten.',
      forgotP2:
        'Neem de tijd en probeer het opnieuw. Na een paar foute pogingen vraagt de app je even te wachten.',
      forgotBiometric: 'Heb je {{method}} ingesteld, dan kun je de app daarmee openen.',
      forgotP3:
        'Vergeet je je pincode, dan kom je er niet meer in: alles in de app gaat dan verloren. Opnieuw beginnen kan alleen door de app te verwijderen en opnieuw in te stellen. Een rapport dat je eerder hebt geëxporteerd blijft bewaard.',
      forgotClose: 'Opnieuw proberen',
      forgotConsequence:
        'Een vergeten pincode kan niet worden teruggehaald of gereset, door jou noch door ons, dus zonder pincode gaat alles in de app verloren.',
      forgotWhatToDo:
        'Neem de tijd en probeer het opnieuw; ben je hem echt kwijt, verwijder de app dan en stel hem opnieuw in.',
      cooldown: {
        one: 'Te vaak geprobeerd. Probeer het over {{count}} seconde opnieuw.',
        other: 'Te vaak geprobeerd. Probeer het over {{count}} seconden opnieuw.',
      },
      biometricFailed: 'Kon niet bevestigen dat jij het bent. Probeer het opnieuw.',
      passcodeFailed: 'Openen met de toegangscode van je telefoon lukte niet. Probeer het opnieuw.',
      biometricLockedOut:
        '{{method}} is gepauzeerd. Ontgrendel je telefoon eenmaal en probeer het dan opnieuw.',
      biometricUnavailable: '{{method}} is nu niet beschikbaar. Gebruik je pincode.',
    },
    biometric: {
      faceId: 'Face ID',
      faceUnlock: 'Gezichtsontgrendeling',
      fingerprint: 'Vingerafdruk',
      iris: 'Iris',
      generic: 'Vingerafdruk of gezicht',
      passcode: 'de toegangscode van je telefoon',
      use: {
        faceId: 'Face ID gebruiken',
        faceUnlock: 'Gezicht gebruiken',
        fingerprint: 'Vinger gebruiken',
        iris: 'Iris gebruiken',
        generic: 'Vinger gebruiken',
        passcode: 'Code gebruiken',
      },
    },
    loading: {
      a11y: '{{appName}} wordt geopend',
    },
    notFound: {
      screenTitle: 'Niet gevonden',
      title: 'Deze pagina bestaat niet',
      message: 'Misschien is hij verplaatst. We brengen je terug.',
      action: 'Naar Vandaag',
    },
  },
  tr: {
    languagesLocal: {
      en: 'İngilizce',
      tr: 'Türkçe',
      nl: 'Felemenkçe',
    },
    welcome: {
      title: 'İlaç kutunuz gibi, ama size hatırlatır.',
      body: 'Sabah, öğle, akşam, gece. Aldığınızda dokunun. Her şey bu telefonda kalır.',
      pictureA11y:
        'Dört bölmeli bir ilaç kutusu: sabah tamam, öğle şimdi açılacak olan, akşam henüz gelmedi ve gece boş.',
      getStarted: 'Başlayalım',
      example: 'Örnek',
      languageTitle: 'Dil',
      languageSubtitle: 'Uygulama hemen değişir.',
      languageA11y: 'Dil: {{language}}. Değiştirmek için iki kez dokunun.',
    },
    disclaimer: {
      title: 'Bilmeniz gerekenler',
      viewSubtitle: 'Başlarken kabul ettikleriniz.',
      fullSubtitle: 'Kabul ettiğiniz metnin tamamı.',
      consentTitle: 'Başlamadan önce',
      readFull: 'Metnin tamamını okuyun',
      agree: 'Anladım ve kabul ediyorum',
      continue: 'Devam',
      pages: {
        privacy: {
          title: 'Verileriniz bu telefonda kalır',
          summary:
            'Hiçbir şey toplanmaz veya yedeklenmez. Telefonu kaybederseniz veya uygulamayı silerseniz verileriniz gider.',
          p1: 'Hiçbir veri toplamıyoruz. Kesinlikle hiçbir şey. Uygulama yalnızca bu telefonda çalışır: hesap, bulut veya çevrimiçi yedekleme yoktur.',
          p2: 'Girdikleriniz bu telefonda şifreli olarak saklanır. Telefonunuz ve ayarladıysanız PIN kodunuz olmadan kimse okuyamaz.',
          p3: 'Dışa aktardığınız rapor şifreli değildir. Onu güvende tutmak sizin sorumluluğunuzdadır. Telefonunuzu kaybederseniz veya uygulamayı silerseniz verileriniz kalıcı olarak gider ve biz geri getiremeyiz. Kâğıt üzerinde bir kopya isterseniz ara sıra bir rapor dışa aktarın.',
        },
        medical: {
          title: 'Bir hatırlatıcı, doktor değil',
          summary:
            'Tıbbi tavsiye vermez; ilaçlarınızı etkileşim veya aşırı doz açısından kontrol etmez.',
          p1: 'Bu uygulama tıbbi tavsiye vermez ve teşhis koymaz. İlaçlarınızı takip etmek için kullanacağınız kağıt takvimin veya günlüğün dijital bir versiyonudur.',
          p2: 'Size neyi ne zaman alacağınızı söylemez. Yalnızca kendi girmeye karar verdiklerinizi hatırlatır. İlaçlar arasındaki etkileşimleri veya aşırı doz risklerini kontrol etmez.',
          p3: 'Aldığınız veya almadığınız hiçbir ilaçtan sorumlu değiliz.',
        },
        technical: {
          title: 'Hatırlatmalar telefonunuza bağlıdır',
          summary:
            'Telefonunuzun saati ve pil ayarları bir hatırlatmayı geciktirebilir veya engelleyebilir.',
          p1: 'Hatırlatmalar telefonunuzun saatini izler. Başka bir saat dilimine giderseniz telefonunuzdaki saati izlerler. Saati veya tarihi elle değiştirmek hatırlatmaların erken, geç ya da hiç gelmemesine neden olabilir.',
          p2: 'Android ve iPhone’daki pil tasarrufu ayarları hatırlatmaları geciktirebilir veya engelleyebilir. Bu uygulamaya pil ayarlarında izin vermek sizin sorumluluğunuzdadır.',
        },
        responsibility: {
          title: 'Girdilerinizi kontrol edin',
          summary:
            'Uygulama yazdıklarınızı izler. Her ilacı etiketine veya reçetesine göre kontrol edin.',
          p1: 'Bu bir hatırlatma aracıdır. Neyi girip neyi alındı olarak işaretleyeceğinize siz karar verirsiniz. Uygulama sizin girdiklerinizi izler.',
          p2: 'Uygulama girdilerinizi hatalara karşı kontrol etmez; kağıtta olduğu gibi yazdıklarınızı gözden geçirin. Uygulama hiçbir garanti olmadan sunulur.',
          p3: 'Dışa aktardığınız raporlar şifreli değildir. Onları nerede saklayacağınıza ve kime göndereceğinize siz karar verirsiniz.',
        },
      },
    },
    protect: {
      title: 'Gizli tutun',
      body: 'Uygulamayı kilitleyin, yalnızca siz açabilin.',
      reconfigureTitle: 'Uygulama kilidi',
      reconfigureBody: 'Uygulamayı nasıl açacağınızı seçin.',
      recommended: 'Önerilen',
      current: 'Şu anki',
      pinTitle: 'PIN kodu',
      pinDescription: 'Yalnızca sizin bildiğiniz 4 ila 6 rakam',
      pinNoRecovery:
        'Bir PIN seçer ve unutursanız tekrar girmenin bir yolu yoktur: uygulamadaki her şey kaybolur. Kâğıt üzerinde bir kopya isterseniz ara sıra bir rapor dışa aktarın.',
      usePinCode: 'PIN kodu kullan',
      useBiometric: 'Parmak izi veya yüz kullan',
      startAgain: 'Eşleşmedi. Baştan başlayalım.',
      pinChangeDescription: 'Yeni bir PIN seçmek için dokunun',
      biometricTitle: 'Parmak izi veya yüz',
      biometricDescription: 'Telefonunuzda zaten olanı kullanır',
      noLockTitle: 'Kilit yok',
      noLockDescription: 'Bu telefonu alan herkes uygulamayı açabilir',
      dontLock: 'Uygulamayı kilitleme',
      choosePin: 'Bir PIN seçin',
      choosePinHint: '4 ila 6 rakam.',
      repeatPin: 'PIN kodunuzu tekrarlayın',
      repeatPinHint: 'Aynı rakamları tekrar yazın.',
      mismatch: 'Eşleşmiyor. Tekrar deneyin.',
      mismatchAgain: 'Eşleşmedi. İlk PIN kodunu tekrar yazın.',
      chooseDifferent: 'Farklı bir PIN seçin',
      tooShort: '4 ila 6 rakam kullanın.',
      next: 'İleri',
      biometricFailed: '{{method}} açılmadı. Tekrar deneyin ya da bir PIN seçin.',
      pinFailed: 'PIN kodunuz kaydedilemedi. Tekrar deneyin.',
      turnOffTitle: 'Kilit kapatılsın mı?',
      turnOffMessage: 'Bu telefonu eline alan herkes uygulamayı açıp ilaçlarınızı görebilir.',
      turnOff: 'Kilidi kapat',
      verifyTitle: 'Önce siz olduğunuzu doğrulayın',
      verifyPinHint: 'Mevcut PIN kodunuzu girin.',
      verifyBiometricHint: 'Devam etmek için {{method}} kullanın.',
      verifyWith: '{{method}} ile doğrula',
      usePin: 'PIN kullan',
      saveFailed: 'Kilit değiştirilemedi. Tekrar deneyin.',
      toast: {
        biometric: '{{method}} açık',
        pin: 'PIN kodunuz ayarlandı',
        off: 'Kilit kapalı',
      },
    },
    profile: {
      title: 'Size nasıl hitap edelim?',
      nameLabel: 'Adınız',
      hint: 'Sadece ilk adınız yeterli. Aile üyelerini daha sonra ekleyebilirsiniz.',
      start: 'Devam',
      nameRequired: 'Devam etmek için bir ad yazın.',
      createError: 'Profiliniz oluşturulamadı. Tekrar deneyin.',
    },
    lock: {
      welcomeBack: 'Tekrar hoş geldiniz',
      welcomeBackName: 'Tekrar hoş geldiniz, {{name}}',
      pinHint: 'Uygulamayı açmak için PIN kodunuzu girin.',
      biometricHint: 'Uygulamayı açmak için {{method}} kullanın.',
      biometricPrompt: '{{appName}} uygulamasını aç',
      unlockWith: '{{method}} ile aç',
      usePin: 'PIN kullan',
      open: 'Aç',
      wrongPin: 'Bu değil. Tekrar deneyin.',
      forgot: 'PIN kodunuzu mu unuttunuz?',
      forgotTitle: 'PIN kodunuzu mu unuttunuz?',
      forgotP1:
        'Unutulan bir PIN geri getirilemez. PIN bu telefondan hiç çıkmaz; bu yüzden biz dahil kimse onu bulamaz veya sıfırlayamaz.',
      forgotP2:
        'Acele etmeyin ve tekrar deneyin. Birkaç yanlış denemeden sonra uygulama bir sonraki deneme için biraz beklemenizi ister.',
      forgotBiometric: '{{method}} ayarladıysanız uygulamayı onunla açabilirsiniz.',
      forgotP3:
        'PIN kodunuzu unutursanız tekrar girmenin bir yolu yoktur: uygulamadaki her şey kaybolur. Baştan başlamanın tek yolu uygulamayı kaldırıp yeniden kurmaktır. Daha önce dışa aktardığınız bir rapor bundan etkilenmez.',
      forgotClose: 'Tekrar dene',
      forgotConsequence:
        'Unutulan bir PIN ne sizin ne de bizim tarafımızdan geri getirilebilir veya sıfırlanabilir; bu yüzden PIN olmadan uygulamadaki her şey kaybolur.',
      forgotWhatToDo:
        'Acele etmeyin ve tekrar deneyin; gerçekten unuttuysanız uygulamayı kaldırıp yeniden kurun.',
      cooldown: {
        one: 'Çok fazla deneme. {{count}} saniye sonra tekrar deneyin.',
        other: 'Çok fazla deneme. {{count}} saniye sonra tekrar deneyin.',
      },
      biometricFailed: 'Siz olduğunuz doğrulanamadı. Tekrar deneyin.',
      passcodeFailed: 'Telefon şifrenizle açılamadı. Tekrar deneyin.',
      biometricLockedOut:
        '{{method}} duraklatıldı. Telefonunuzun kilidini bir kez açın, sonra tekrar deneyin.',
      biometricUnavailable: '{{method}} şu anda kullanılamıyor. PIN kodunuzu kullanın.',
    },
    biometric: {
      faceId: 'Face ID',
      faceUnlock: 'Yüz tanıma',
      fingerprint: 'Parmak izi',
      iris: 'İris',
      generic: 'Parmak izi veya yüz',
      passcode: 'telefon şifreniz',
      use: {
        faceId: 'Face ID kullan',
        faceUnlock: 'Yüz kullan',
        fingerprint: 'Parmak izi kullan',
        iris: 'İris kullan',
        generic: 'Parmak izi kullan',
        passcode: 'Şifre kullan',
      },
    },
    loading: {
      a11y: '{{appName}} açılıyor',
    },
    notFound: {
      screenTitle: 'Bulunamadı',
      title: 'Bu sayfa yok',
      message: 'Taşınmış olabilir. Sizi geri götürelim.',
      action: 'Bugün’e git',
    },
  },
});
