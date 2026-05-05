export const conflictSymbols = {
  controle_vs_entrega: [
    "hands gripping tightly",
    "rigid posture",
    "overly organized environment"
  ],
  medo_vs_coragem: [
    "threshold light vs shadow",
    "one step forward hesitation"
  ],
  abandono_vs_presenca: [
    "empty chair",
    "space suggesting absence",
    "one side of the room empty"
  ],
  aparencia_vs_essencia: [
    "mirror showing different reflection",
    "surface vs depth focus",
    "mask-like shadows"
  ],
  default: [
    "subtle tension in the air",
    "introspective stillness"
  ]
};

export function mapConflict(conflito) {
    if (!conflito) return conflictSymbols.default;
    const norm = conflito.toLowerCase().trim();
    for (const key of Object.keys(conflictSymbols)) {
        if (norm.includes(key)) return conflictSymbols[key];
    }
    return conflictSymbols.default;
}
