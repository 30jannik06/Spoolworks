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
  },
  home: {
    landingTitle: "Dein Filament, deine Drucke, ein Ort.",
    landingBody:
      "Jeder Druck weiß, welche Spulen er verbraucht hat. Das Lager rechnet den Rest automatisch runter.",
    welcome: (name: string) => `Hallo ${name}!`,
    workshop: "Deine Werkstatt",
    lowStockThreshold: (grams: number) => `Warnung bei wenig Rest: ab ${grams} g`,
    comingSoon: "Spulen, Drucker und Drucke kommen in den nächsten Phasen.",
  },
  auth: {
    loginTitle: "Anmelden",
    loginSubmit: "Anmelden",
    registerTitle: "Konto erstellen",
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
