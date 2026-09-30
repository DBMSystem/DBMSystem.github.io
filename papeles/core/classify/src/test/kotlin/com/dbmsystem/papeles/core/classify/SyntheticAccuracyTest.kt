package com.dbmsystem.papeles.core.classify

import com.dbmsystem.papeles.tools.synthetic.SyntheticCorpus
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.util.Locale

/**
 * M3 "Listo cuando": at least 95 % of the synthetic set gets the right type, and no classification lacks reasons.
 * Writes build/reports/classification.json with the accuracy per format.
 */
class SyntheticAccuracyTest {
    private val classifier = DocumentClassifier()

    @Test
    fun `classifies the synthetic set with at least 95 percent accuracy`() {
        val corpus = SyntheticCorpus.generate()
        val results = corpus.map { it to classifier.classify(it.pages) }

        assertTrue(results.all { (_, classification) -> classification.reasons.isNotEmpty() })
        val byFormat =
            results.groupBy { it.first.format }.mapValues { (_, list) ->
                Triple(
                    list.count { (doc, c) -> c.type == doc.type }.toDouble() / list.size,
                    list.count { (doc, c) -> c.type == doc.type && !classifier.needsUserChoice(c) }.toDouble() /
                        list.size,
                    list.filter { (doc, c) -> c.type != doc.type }.map { (doc, c) -> "${doc.id} -> ${c.type}" },
                )
            }
        val accuracy = results.count { (doc, c) -> c.type == doc.type }.toDouble() / results.size
        val confident =
            results.count { (doc, c) -> c.type == doc.type && !classifier.needsUserChoice(c) }.toDouble() / results.size
        writeReport(results.size, accuracy, confident, byFormat)

        val mistakes = byFormat.values.flatMap { it.third }
        assertTrue("Accuracy ${percent(accuracy)} below 95 %: $mistakes", accuracy >= 0.95)
    }

    private fun writeReport(
        documents: Int,
        accuracy: Double,
        confident: Double,
        byFormat: Map<*, Triple<Double, Double, List<String>>>,
    ) {
        val formats =
            byFormat.entries.joinToString(",\n") { (format, stats) ->
                "    \"$format\": {\"accuracy\": ${percent(
                    stats.first,
                )}, \"rightWithoutAsking\": ${percent(stats.second)}}"
            }
        File("build/reports").mkdirs()
        File("build/reports/classification.json").writeText(
            """
            |{
            |  "note": "Synthetic documents are cleaner than real ones: this is not a real-world accuracy.",
            |  "documents": $documents,
            |  "accuracy": ${percent(accuracy)},
            |  "rightWithoutAsking": ${percent(confident)},
            |  "formats": {
            |$formats
            |  }
            |}
            |
            """.trimMargin(),
        )
    }

    private fun percent(value: Double) = String.format(Locale.ROOT, "%.3f", value)
}
