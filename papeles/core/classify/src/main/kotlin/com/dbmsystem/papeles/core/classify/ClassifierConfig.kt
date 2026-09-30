package com.dbmsystem.papeles.core.classify

/** Numbers of the classifier. All are hypotheses, tuned on the synthetic set. */
data class ClassifierConfig(
    /** Below this score no type has enough evidence and the document counts as OTHER. */
    val minScore: Float = 4f,
    /** From this score on, the evidence for a type counts as complete. */
    val strongScore: Float = 10f,
    /** Below this confidence the app asks the user what the document is (M3). */
    val askBelow: Float = 0.7f,
    /** Confidence of OTHER when no type shows any signal at all. */
    val otherConfidence: Float = 0.8f,
)
