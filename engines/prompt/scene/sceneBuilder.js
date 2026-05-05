export function buildScene({ intent, emotion, symbols, base, persona }) {
    const isHuman = !!persona && !persona.isNoPerson;
    
    let subjectBlock = "";
    if (isHuman) {
        const personaDesc = persona.isAbstract ? "person" : "woman in her 30s";
        subjectBlock = `${personaDesc} in ${emotion.pose} posture.`;
    } else {
        subjectBlock = "No human figures. Focus purely on environment and objects.";
    }

    const baseEnv = base ? base.split('.')[0] : `Minimal editorial space, ${emotion.environment}`;

    return {
        environment: baseEnv,
        subject: subjectBlock,
        action: `Energy is ${emotion.energy}. ${intent.narrative_moment}.`,
        symbolism: symbols.join(", "),
        mood: `introspective, emotionally dense, ${intent.scene_intent}`,
        lighting: emotion.lighting,
        color: emotion.color,
        emotion: emotion.pose // generic placeholder for string builder
    };
}
