/**
 * All user-facing German copy lives here, never inline in components.
 * Keys are English and grouped by area, so an English catalogue (next-intl)
 * can be added later by mirroring this object's shape.
 */
export const de = {
  app: {
    name: "SpoolWorks",
    tagline: "Filament-Lager und Druck-Galerie, die zusammen rechnen.",
  },
  nav: {
    signIn: "Anmelden",
    signUp: "Registrieren",
    signOut: "Abmelden",
    home: "Start",
    spools: "Spulen",
    printers: "Drucker",
    prints: "Drucke",
    quickActions: "Schnellaktionen",
    close: "Schließen",
  },
  quickActions: {
    title: "Was möchtest du tun?",
    logPrint: "Druck buchen",
    logPrintHint: "Verbrauch auf Spulen abbuchen",
    weighSpool: "Spule wiegen",
    weighSpoolHint: "Restgewicht per Waage eintragen",
    addSpool: "Spule anlegen",
    addSpoolHint: "Neue Spule ins Lager",
    comingInPhase: (phase: number) => `Phase ${phase}`,
  },
  theme: {
    toggle: "Darstellung wechseln",
    light: "Hell",
    dark: "Dunkel",
    system: "System",
  },
  home: {
    landingEyebrow: "Für 3D-Druck-Werkstätten",
    landingTitle: "Dein Filament, deine Drucke, ein Ort.",
    landingBody:
      "Jeder Druck weiß, welche Spulen er verbraucht hat. Das Lager rechnet den Rest automatisch runter.",
    landingPoints: [
      "Restgewicht pro Spule, automatisch oder per Waage",
      "AMS-Slots auf einen Blick",
      "Druck-Galerie mit Verbrauch und Fotos",
    ],
    greeting: (name: string) => `Hallo ${name}`,
    stockEyebrow: "Bestand",
    stockEmpty: "Noch keine Spulen",
    stockUnit: "kg",
    lowStockEyebrow: "Warnung ab",
    lowStockValue: (grams: number) => `${grams} g`,
    printsEyebrow: "Drucke",
    printsEmpty: "0",
    amsEyebrow: "AMS",
    amsEmpty: "Leg in Phase 2 deinen Drucker mit AMS an, dann siehst du hier die Slots.",
    nextTitle: "Als Nächstes",
    nextBody: "Phase 1 bringt die Filament-Bibliothek: Spulen anlegen, wiegen, filtern.",
  },
  placeholder: {
    spoolsTitle: "Spulen",
    spoolsBody: "Hier landet deine Filament-Bibliothek. Kommt mit Phase 1.",
    printersTitle: "Drucker",
    printersBody: "Drucker und AMS-Slots verwaltest du hier. Kommt mit Phase 2.",
    printsTitle: "Drucke",
    printsBody: "Deine Druck-Galerie mit Fotos und Verbrauch. Kommt mit Phase 3.",
  },
  auth: {
    loginTitle: "Willkommen zurück",
    loginSubtitle: "Melde dich in deiner Werkstatt an.",
    loginSubmit: "Anmelden",
    registerTitle: "Werkstatt anlegen",
    registerSubtitle: "Ein Konto, eine Werkstatt. Alles bleibt privat.",
    registerSubmit: "Konto erstellen",
    name: "Name",
    email: "E-Mail",
    password: "Passwort",
    passwordHint: "Mindestens 8 Zeichen.",
    noAccount: "Noch kein Konto?",
    haveAccount: "Schon ein Konto?",
    pending: "Einen Moment …",
  },
  common: {
    loading: "Lädt …",
  },
} as const;

export type Messages = typeof de;
