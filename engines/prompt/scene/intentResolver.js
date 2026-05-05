export function resolveSceneIntent(semantic) {
  if (!semantic) {
      return {
        scene_intent: "internal_conflict",
        narrative_moment: "pause_before_change",
        visual_direction: "editorial_psychological"
      };
  }
  
  const map = {
    reflexao: "internal_conflict",
    identificacao: "mirror_scene",
    tensao: "breaking_point",
    validacao: "soft_acceptance",
    quebra: "paradigm_shift",
    provocacao: "confrontational_truth"
  };

  const resolveMoment = (conflito) => {
    if (!conflito) return "pause_before_change";
    if (conflito.includes("vs")) return "weighing_options";
    return "realization";
  };

  return {
    scene_intent: map[semantic.tipo] || "internal_conflict",
    narrative_moment: resolveMoment(semantic.conflito),
    visual_direction: "editorial_psychological"
  };
}
