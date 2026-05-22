type IntelligenceStripProps = {
  ai_mood?: string;
  ai_importance?: string;
  ai_sentiment?: string;
  ai_emotional_weight?: string;
  ai_confidence?: number;
};

function normalizeConfidence(
  confidence?: number
) {
  if (
    typeof confidence !== "number" ||
    Number.isNaN(confidence)
  ) {
    return 92;
  }

  if (confidence <= 1) {
    return Math.round(
      confidence * 100
    );
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(confidence)
    )
  );
}

function buildConfidenceLabel(
  confidence?: number
) {
  return `${normalizeConfidence(
    confidence
  )}%`;
}

function normalizeText(
  value: string | undefined,
  fallback: string
) {
  const normalized =
    value?.trim();

  return normalized || fallback;
}

export default function IntelligenceStrip({
  ai_mood,
  ai_importance,
  ai_sentiment,
  ai_emotional_weight,
  ai_confidence,
}: IntelligenceStripProps) {
  const normalizedMood =
    normalizeText(
      ai_mood,
      "Stable"
    );

  const normalizedImportance =
    normalizeText(
      ai_importance,
      "Medium"
    );

  const normalizedSentiment =
    normalizeText(
      ai_sentiment,
      "Neutral"
    );

  const normalizedEmotionalWeight =
    normalizeText(
      ai_emotional_weight,
      "Light"
    );

  const confidenceLabel =
    buildConfidenceLabel(
      ai_confidence
    );

  return (
    <div className="flex flex-wrap gap-3 mt-8">
      <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm whitespace-nowrap">
        Mood: {normalizedMood}
      </span>

      <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm whitespace-nowrap">
        Importance: {normalizedImportance}
      </span>

      <span className="px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm whitespace-nowrap">
        Sentiment: {normalizedSentiment}
      </span>

      <span className="px-4 py-2 rounded-full bg-pink-100 text-pink-700 text-sm whitespace-nowrap">
        Emotional Weight: {normalizedEmotionalWeight}
      </span>

      <span className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm whitespace-nowrap">
        AI Confidence: {confidenceLabel}
      </span>
    </div>
  );
}