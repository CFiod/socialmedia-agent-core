export const emotionMap = {
  dor: {
    lighting: "low_key_soft",
    color: "desaturated_warm",
    pose: "closed_body",
    energy: "slow",
    environment: "empty_spacious"
  },
  culpa: {
    lighting: "top_light",
    color: "muted_cool",
    pose: "head_down",
    energy: "static",
    environment: "tight_space"
  },
  libertacao: {
    lighting: "soft_backlight",
    color: "warm_airy",
    pose: "open_body",
    energy: "dynamic_light",
    environment: "expansive"
  },
  ansiedade: {
    lighting: "mixed_light",
    color: "high_contrast",
    pose: "restless",
    energy: "chaotic",
    environment: "cluttered"
  },
  curiosidade: {
    lighting: "directional_window_light",
    color: "neutral_warm",
    pose: "leaning_forward",
    energy: "focused",
    environment: "minimalist_study"
  },
  neutro: {
    lighting: "soft_diffused",
    color: "neutral",
    pose: "relaxed",
    energy: "still",
    environment: "clean_architectural"
  }
};

export function mapEmotion(emotionString) {
    const key = (emotionString || "neutro").toLowerCase().trim();
    return emotionMap[key] || emotionMap.neutro;
}
