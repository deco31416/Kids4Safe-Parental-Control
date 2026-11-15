/** Official Kids4Safe palette for parent and child screens. */
export const brand = {
  navy: "#0B2454", blue: "#1265C8", brightBlue: "#168FE0", turquoise: "#20B9BE",
  ice: "#EAF4FF", cloud: "#F1F8FF", white: "#FFFFFF", slate: "#66758F"
} as const;
export const gradients = { button: [brand.blue, brand.navy], brand: [brand.brightBlue, brand.turquoise] } as const;
export const colors = {
  primary: brand.blue, primaryDark: brand.navy, secondary: brand.brightBlue, accent: brand.turquoise,
  onPrimary: brand.white, inputBackground: brand.ice,
  background: brand.cloud, card: brand.white, cardMuted: brand.ice, surface: brand.white, surfaceRaised: brand.ice,
  text: brand.navy, textSecondary: brand.slate, textMuted: brand.slate,
  action: brand.blue, actionPressed: brand.navy, actionSoft: "rgba(18,101,200,0.08)", actionBorder: "rgba(18,101,200,0.22)",
  border: "#D5E6F8", borderSoft: "rgba(18,101,200,0.12)",
  danger: "#EF4444", success: "#16834B", successSoft: "rgba(22,131,75,0.10)",
  homeBackground: brand.cloud, homeSurface: brand.white, homeText: brand.navy, homeMuted: brand.slate, homeBorder: "#D5E6F8",
  gpsActive: "#16834B", gpsActiveSoft: "#E8FBEF", gpsInactive: "#EF4444", gpsInactiveSoft: "#FEECEC",
  overlay: "rgba(11,36,84,0.48)"
};
