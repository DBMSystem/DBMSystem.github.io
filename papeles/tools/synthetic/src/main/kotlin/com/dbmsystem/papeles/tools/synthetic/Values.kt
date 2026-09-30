package com.dbmsystem.papeles.tools.synthetic

import java.time.LocalDate
import java.time.YearMonth
import java.util.Locale
import kotlin.math.roundToLong
import kotlin.random.Random

/** Random values for the templates, drawn from one seeded [Random] so the corpus is reproducible. */
internal class Values(
    val random: Random,
) {
    fun <T> pick(items: List<T>): T = items[random.nextInt(items.size)]

    fun int(
        from: Int,
        until: Int,
    ): Int = random.nextInt(from, until)

    fun amount(
        from: Double,
        until: Double,
    ): Double = round2(from + random.nextDouble() * (until - from))

    fun chance(probability: Double): Boolean = random.nextDouble() < probability

    fun month(): YearMonth = YearMonth.of(2026, int(1, 13))

    fun digits(count: Int): String = (1..count).joinToString("") { int(0, 10).toString() }

    /** A made-up supply point code with the CUPS shape: ES, 16 digits and two letters. */
    fun cups(): String = "ES" + digits(16) + pick(LETTERS) + pick(LETTERS)

    fun maskedIban(): String = "ES${digits(2)} **** **** **** ${digits(4)}"

    fun person(): String = "${pick(FIRST_NAMES)} ${pick(SURNAMES)} ${pick(SURNAMES)}"

    fun address(): String = "${pick(STREETS)} ${int(1, 120)}, ${pick(TOWNS)}"

    private companion object {
        val LETTERS = ('A'..'Z').map { it.toString() }
        val FIRST_NAMES =
            listOf("Lucía", "Martín", "Carmen", "Hugo", "Inés", "Álvaro", "Noa", "Andrés", "Sofía", "Iñaki")
        val SURNAMES = listOf("García", "Martínez", "López", "Sánchez", "Pérez", "Gómez", "Núñez", "Ibáñez", "Rueda")
        val STREETS = listOf("C/ Mayor", "Avda. de la Constitución", "C/ del Río", "Plaza de España", "C/ Olmo")
        val TOWNS = listOf("Valladolid", "Córdoba", "Logroño", "Cáceres", "Almería", "León", "Jaén")
    }
}

internal fun round2(value: Double): Double = (value * 100).roundToLong() / 100.0

/** Spanish format with thousands separator: 1.234,56 */
internal fun money(value: Double): String =
    String
        .format(Locale.ROOT, "%,.2f", value)
        .replace(",", "_")
        .replace(".", ",")
        .replace("_", ".")

/** Truth format: 1234.56 */
internal fun truthAmount(value: Double): String = String.format(Locale.ROOT, "%.2f", value)

internal fun date(value: LocalDate): String = "%02d/%02d/%d".format(value.dayOfMonth, value.monthValue, value.year)

internal val MONTH_NAMES =
    listOf(
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
    )

internal fun YearMonth.spanishName(): String = MONTH_NAMES[monthValue - 1]
