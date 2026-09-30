package com.dbmsystem.papeles.tools.synthetic

import java.time.YearMonth

private val EMPLOYERS =
    listOf(
        "Cocinas del Sur, S.L.",
        "Talleres Norte Ibérica, S.A.",
        "Distribuciones Olivar, S.L.",
        "Clínica Veterinaria Alba, S.L.P.",
        "Logística Meseta, S.A.",
        "Panadería Hermanos Ruiz, S.L.",
    )
private val CATEGORIES =
    listOf("Oficial de 1ª", "Auxiliar administrativo", "Cocinero", "Técnico de almacén", "Dependienta")

/** Social Security rates paid by the worker: common contingencies, unemployment, training and MEI. */
private val SOCIAL_SECURITY_RATES = listOf(4.70, 1.55, 0.10, 0.13)

/** The numbers every payslip format shows, computed so that they add up. */
private class Payslip(
    values: Values,
    earnings: List<Pair<String, Double>>,
) {
    val company = values.pick(EMPLOYERS)
    val worker = values.person()
    val category = values.pick(CATEGORIES)
    val month: YearMonth = values.month()
    val irpfPercent = values.int(2, 23).toDouble()
    val earnings = earnings
    val gross = round2(earnings.sumOf { it.second })
    val socialSecurityItems = SOCIAL_SECURITY_RATES.map { it to round2(gross * it / 100) }
    val socialSecurity = round2(socialSecurityItems.sumOf { it.second })
    val irpf = round2(gross * irpfPercent / 100)
    val deductions = round2(socialSecurity + irpf)
    val net = round2(gross - deductions)
    val from = date(month.atDay(1))
    val to = date(month.atEndOfMonth())

    fun truth() =
        mapOf(
            "company" to company,
            "period" to month.toString(),
            "gross" to truthAmount(gross),
            "net" to truthAmount(net),
            "irpfPercent" to truthAmount(irpfPercent),
            "socialSecurity" to truthAmount(socialSecurity),
        )
}

private fun baseEarnings(values: Values) =
    listOf(
        "Salario base" to values.amount(1150.0, 2600.0),
        "Plus convenio" to values.amount(40.0, 260.0),
    )

internal fun classicPayslip(values: Values): Draft {
    val p = Payslip(values, baseEarnings(values) + ("Plus transporte" to values.amount(30.0, 90.0)))
    return Draft(
        page {
            title("RECIBO INDIVIDUAL JUSTIFICATIVO DEL PAGO DE SALARIOS")
            row("EMPRESA", p.company)
            row("CIF", "B${values.digits(8)}")
            row("DOMICILIO", values.address())
            row("TRABAJADOR", p.worker)
            row("Nº AFILIACIÓN S.S.", values.digits(12))
            row("CATEGORÍA", p.category)
            line("PERIODO DE LIQUIDACIÓN: del ${p.from} al ${p.to}   TOTAL DÍAS 30")
            gap()
            line("I. DEVENGOS")
            p.earnings.forEach { (concept, amount) -> row(concept, money(amount)) }
            row("A. TOTAL DEVENGADO", money(p.gross))
            line("II. DEDUCCIONES")
            val labels = listOf("Contingencias comunes", "Desempleo", "Formación profesional", "MEI")
            p.socialSecurityItems.zip(labels).forEach { (item, label) ->
                row("$label ${money(item.first)} %", money(item.second))
            }
            row("Impuesto sobre la renta de las personas físicas ${money(p.irpfPercent)} %", money(p.irpf))
            row("B. TOTAL A DEDUCIR", money(p.deductions))
            row("LÍQUIDO TOTAL A PERCIBIR (A-B)", money(p.net))
            gap()
            line("DETERMINACIÓN DE LAS BASES DE COTIZACIÓN A LA SEGURIDAD SOCIAL")
            row("Base de contingencias comunes", money(p.gross))
            line("Firma y sello de la empresa          Recibí")
        },
        p.truth(),
    )
}

internal fun modernPayslip(values: Values): Draft {
    val p = Payslip(values, baseEarnings(values))
    return Draft(
        page {
            title("Nómina de ${p.month.spanishName()} de ${p.month.year}")
            line(p.company)
            line("CIF B${values.digits(8)} · ${values.address()}")
            gap()
            row("Empleado", p.worker)
            row("Puesto", p.category)
            row("Periodo", "${p.from} - ${p.to}")
            gap()
            row("Concepto", "Importe")
            row("Salario bruto mensual", money(p.earnings[0].second))
            row("Complemento de puesto", money(p.earnings[1].second))
            row("Total bruto", money(p.gross))
            row("Retención IRPF (${money(p.irpfPercent)} %)", "-${money(p.irpf)}")
            row("Cotización a la Seguridad Social", "-${money(p.socialSecurity)}")
            row("Neto a cobrar", money(p.net))
            gap()
            line("Transferencia a la cuenta ${values.maskedIban()}")
        },
        p.truth(),
    )
}

internal fun overtimePayslip(values: Values): Draft {
    val hours = values.int(2, 21)
    val p = Payslip(values, baseEarnings(values) + ("Horas extraordinarias ($hours h)" to round2(hours * 14.5)))
    return Draft(
        page {
            title("NÓMINA")
            row("Empresa", p.company)
            row("Trabajador/a", p.worker)
            row("Categoría profesional", p.category)
            row("Grupo de cotización", values.int(1, 11).toString())
            row("Periodo de liquidación", "${p.from} a ${p.to}")
            gap()
            cells(0.08f to "Concepto", 0.55f to "Devengos", 0.78f to "Deducciones")
            p.earnings.forEach { (concept, amount) -> cells(0.08f to concept, 0.55f to money(amount)) }
            cells(0.08f to "Cotización contingencias comunes", 0.78f to money(p.socialSecurityItems[0].second))
            cells(0.08f to "Cotización desempleo", 0.78f to money(p.socialSecurityItems[1].second))
            cells(0.08f to "Cotización formación profesional", 0.78f to money(p.socialSecurityItems[2].second))
            cells(0.08f to "Mecanismo de equidad intergeneracional", 0.78f to money(p.socialSecurityItems[3].second))
            cells(0.08f to "Retención IRPF ${money(p.irpfPercent)} %", 0.78f to money(p.irpf))
            cells(0.08f to "Total devengos", 0.55f to money(p.gross))
            cells(0.08f to "Total deducciones", 0.78f to money(p.deductions))
            row("Líquido a percibir", money(p.net))
        },
        p.truth(),
    )
}

internal fun codedPayslip(values: Values): Draft {
    val p = Payslip(values, baseEarnings(values) + ("Antigüedad" to values.amount(20.0, 180.0)))
    return Draft(
        page {
            title("NÓMINA MES: ${p.month.spanishName().uppercase()} ${p.month.year}")
            line(p.company.uppercase())
            line("TRABAJADOR: ${p.worker.uppercase()}")
            line("PERIODO ${p.from} - ${p.to}")
            gap()
            val codes = listOf("001", "002", "015")
            p.earnings.zip(codes).forEach { (earning, code) ->
                cells(0.08f to code, 0.16f to earning.first.uppercase(), 0.75f to money(earning.second))
            }
            val deductions =
                listOf("700 COT. CONT. COMUNES", "701 COT. DESEMPLEO", "702 COT. FORMACIÓN", "703 COT. MEI")
            p.socialSecurityItems.zip(deductions).forEach { (item, label) ->
                cells(0.08f to label, 0.75f to money(item.second))
            }
            cells(0.08f to "710 RETENCIÓN I.R.P.F. ${money(p.irpfPercent)}%", 0.75f to money(p.irpf))
            row("TOTAL DEVENGADO", money(p.gross))
            row("TOTAL DEDUCCIONES", money(p.deductions))
            row("LÍQUIDO A PERCIBIR", money(p.net))
        },
        p.truth(),
    )
}

internal fun partTimePayslip(values: Values): Draft {
    val share = values.pick(listOf(50, 60, 75))
    val base = values.amount(600.0, 1300.0)
    val p =
        Payslip(
            values,
            listOf("Salario base" to base, "Prorrata pagas extraordinarias" to round2(base / 6)),
        )
    return Draft(
        page {
            title("Recibo de salarios")
            line("${p.company} · CIF B${values.digits(8)}")
            row("Persona trabajadora", p.worker)
            row("Tipo de contrato", "Tiempo parcial ($share %)")
            row("Periodo", "${p.from} al ${p.to}")
            gap()
            line("Devengos")
            p.earnings.forEach { (concept, amount) -> row(concept, money(amount)) }
            row("Total devengado", money(p.gross))
            line("Deducciones")
            row("Seguridad Social trabajador", money(p.socialSecurity))
            row("IRPF (${money(p.irpfPercent)} %)", money(p.irpf))
            row("Total deducciones", money(p.deductions))
            row("Líquido a percibir", money(p.net))
            line("Base de cotización: ${money(p.gross)}")
        },
        p.truth(),
    )
}
