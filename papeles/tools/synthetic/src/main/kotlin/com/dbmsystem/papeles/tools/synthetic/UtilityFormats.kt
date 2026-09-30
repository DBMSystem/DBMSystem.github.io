package com.dbmsystem.papeles.tools.synthetic

import java.time.LocalDate

private val ELECTRICITY_SUPPLIERS = listOf("Luminia Energía", "Voltara Comercializadora", "Enerbasa Luz")
private val GAS_SUPPLIERS = listOf("Gasnova", "Calorea Gas Natural")
private val WATER_SUPPLIERS = listOf("Aguas del Valle", "Servicio Municipal de Aguas de Riberas")
private val TELECOM_SUPPLIERS = listOf("Telenube", "Fibrano Comunicaciones")

/** A billing period of about a month and its totals; [lines] add up to the base, then VAT. */
private class Bill(
    values: Values,
    val supplier: String,
    val supply: String,
    lines: List<Pair<String, Double>>,
    val vatPercent: Int,
    val consumption: String,
) {
    val start: LocalDate = values.month().atDay(values.int(1, 20))
    val end: LocalDate = start.plusDays(values.int(27, 33).toLong())
    val issued: LocalDate = end.plusDays(values.int(2, 9).toLong())
    val lines = lines
    val base = round2(lines.sumOf { it.second })
    val vat = round2(base * vatPercent / 100)
    val total = round2(base + vat)
    val number = "F${values.digits(2)}-${values.digits(7)}"

    fun truth() =
        mapOf(
            "supplier" to supplier,
            "supply" to supply,
            "periodStart" to start.toString(),
            "periodEnd" to end.toString(),
            "amount" to truthAmount(total),
            "consumption" to consumption,
        )
}

private fun electricity(values: Values): Pair<Int, List<Pair<String, Double>>> {
    val kwh = values.int(90, 520)
    val power = values.amount(25.0, 45.0)
    val energy = round2(kwh * values.amount(0.11, 0.19))
    val tax = round2((power + energy) * 0.0511)
    return kwh to listOf("power" to power, "energy" to energy, "tax" to tax, "meter" to values.amount(0.8, 1.6))
}

internal fun detailedElectricityBill(values: Values): Draft {
    val (kwh, items) = electricity(values)
    val bill = Bill(values, values.pick(ELECTRICITY_SUPPLIERS), "ELECTRICITY", items, 21, "$kwh kWh")
    return Draft(
        page {
            title(bill.supplier)
            line("Factura de electricidad")
            row("Nº de factura", bill.number)
            row("Fecha de emisión", date(bill.issued))
            row("Periodo de facturación", "del ${date(bill.start)} al ${date(bill.end)}")
            row("Titular del contrato", values.person())
            row("Dirección de suministro", values.address())
            row("CUPS", values.cups())
            row("Potencia contratada", "P1: 4,6 kW   P2: 4,6 kW")
            gap()
            line("Resumen de la factura")
            row("Término de potencia", money(items[0].second))
            row("Energía consumida ($kwh kWh)", money(items[1].second))
            row("Impuesto sobre la electricidad", money(items[2].second))
            row("Alquiler de equipos de medida", money(items[3].second))
            row("IVA ${bill.vatPercent} %", money(bill.vat))
            row("TOTAL FACTURA", "${money(bill.total)} €")
            gap()
            line("Se cargará en la cuenta ${values.maskedIban()}")
        },
        bill.truth(),
    )
}

internal fun summaryElectricityBill(values: Values): Draft {
    val (kwh, items) = electricity(values)
    val bill = Bill(values, values.pick(ELECTRICITY_SUPPLIERS), "ELECTRICITY", items, 21, "$kwh kWh")
    return Draft(
        page {
            title("Tu factura de luz")
            line(bill.supplier)
            row("Importe total", "${money(bill.total)} €")
            row("Consumo en este periodo", "$kwh kWh")
            row("Periodo", "${date(bill.start)} - ${date(bill.end)}")
            row("Precio medio de la energía", "${money(items[1].second / kwh)} €/kWh")
            gap()
            line("Detalle")
            row("Peajes de acceso, cargos y potencia", money(items[0].second))
            row("Energía", money(items[1].second))
            row("Impuesto eléctrico", money(items[2].second))
            row("Alquiler del contador", money(items[3].second))
            row("IVA", money(bill.vat))
            gap()
            line("Código de suministro (CUPS): ${values.cups()}")
            line("Distribuidora: Redes Eléctricas del Centro")
        },
        bill.truth(),
    )
}

internal fun tableElectricityBill(values: Values): Draft {
    val (kwh, items) = electricity(values)
    val bill = Bill(values, values.pick(ELECTRICITY_SUPPLIERS), "ELECTRICITY", items, 21, "$kwh kWh")
    val days = bill.end.toEpochDay() - bill.start.toEpochDay()
    return Draft(
        page {
            title("FACTURA ${bill.number}")
            line("${bill.supplier} · Suministro eléctrico")
            line("CUPS ${values.cups()}   Tarifa 2.0TD")
            line("Periodo: ${date(bill.start)} a ${date(bill.end)} ($days días)")
            gap()
            cells(0.08f to "CONCEPTO", 0.5f to "CANTIDAD", 0.78f to "IMPORTE")
            cells(0.08f to "Potencia P1", 0.5f to "4,60 kW x $days días", 0.78f to money(items[0].second))
            cells(0.08f to "Energía activa", 0.5f to "$kwh kWh", 0.78f to money(items[1].second))
            cells(0.08f to "Impuesto electricidad", 0.5f to "5,11 %", 0.78f to money(items[2].second))
            cells(0.08f to "Alquiler equipo", 0.5f to "$days días", 0.78f to money(items[3].second))
            cells(0.08f to "IVA", 0.5f to "21 %", 0.78f to money(bill.vat))
            row("TOTAL", "${money(bill.total)} €")
        },
        bill.truth(),
    )
}

private fun gas(values: Values): Triple<Int, Int, List<Pair<String, Double>>> {
    val cubicMetres = values.int(12, 95)
    val kwh = (cubicMetres * 10.9).toInt()
    val fixed = values.amount(8.0, 12.0)
    val variable = round2(kwh * values.amount(0.06, 0.1))
    val tax = round2(kwh * 0.00234)
    return Triple(cubicMetres, kwh, listOf("fixed" to fixed, "variable" to variable, "tax" to tax, "meter" to 0.6))
}

internal fun detailedGasBill(values: Values): Draft {
    val (cubicMetres, kwh, items) = gas(values)
    val bill = Bill(values, values.pick(GAS_SUPPLIERS), "GAS", items, 21, "$kwh kWh")
    val previous = values.int(1000, 9000)
    return Draft(
        page {
            title(bill.supplier)
            line("Factura de gas natural")
            row("Nº de factura", bill.number)
            row("Periodo de facturación", "${date(bill.start)} - ${date(bill.end)}")
            row("CUPS", values.cups())
            row("Tarifa de acceso", "RL.1")
            row("Lectura anterior", "$previous m³")
            row("Lectura actual", "${previous + cubicMetres} m³")
            row("Consumo", "$cubicMetres m³ ($kwh kWh)")
            gap()
            row("Término fijo", money(items[0].second))
            row("Término variable", money(items[1].second))
            row("Impuesto especial sobre hidrocarburos", money(items[2].second))
            row("Alquiler de contador", money(items[3].second))
            row("IVA 21 %", money(bill.vat))
            row("Total a pagar", "${money(bill.total)} €")
        },
        bill.truth(),
    )
}

internal fun summaryGasBill(values: Values): Draft {
    val (cubicMetres, kwh, items) = gas(values)
    val bill = Bill(values, values.pick(GAS_SUPPLIERS), "GAS", items, 21, "$kwh kWh")
    return Draft(
        page {
            title("Tu factura de gas")
            line(bill.supplier)
            row("Importe", "${money(bill.total)} €")
            row("Consumo del periodo", "$kwh kWh")
            line("Equivale a $cubicMetres m³ de gas natural")
            row("Del", date(bill.start))
            row("Al", date(bill.end))
            gap()
            row("Cuota fija", money(items[0].second))
            row("Energía consumida", money(items[1].second))
            row("Impuesto de hidrocarburos", money(items[2].second))
            row("Contador", money(items[3].second))
            row("IVA", money(bill.vat))
            line("Punto de suministro ${values.cups()}")
        },
        bill.truth(),
    )
}

internal fun waterBill(values: Values): Draft {
    val cubicMetres = values.int(6, 40)
    val items =
        listOf(
            "service" to values.amount(6.0, 11.0),
            "water" to round2(cubicMetres * values.amount(0.5, 0.9)),
            "sewer" to round2(cubicMetres * values.amount(0.3, 0.5)),
            "canon" to round2(cubicMetres * 0.45),
        )
    val bill = Bill(values, values.pick(WATER_SUPPLIERS), "WATER", items, 10, "$cubicMetres m³")
    val previous = values.int(100, 3000)
    return Draft(
        page {
            title(bill.supplier)
            line("Factura del servicio de agua")
            row("Abonado", values.person())
            row("Nº de contador", values.digits(8))
            row("Periodo", "${date(bill.start)} a ${date(bill.end)}")
            row("Lectura anterior", "$previous m³")
            row("Lectura actual", "${previous + cubicMetres} m³")
            row("Consumo", "$cubicMetres m³")
            gap()
            row("Cuota de servicio", money(items[0].second))
            row("Consumo de agua", money(items[1].second))
            row("Alcantarillado", money(items[2].second))
            row("Canon de saneamiento", money(items[3].second))
            row("IVA 10 %", money(bill.vat))
            row("Total", "${money(bill.total)} €")
        },
        bill.truth(),
    )
}

internal fun bundleTelecomBill(values: Values): Draft {
    val gigabytes = values.pick(listOf(20, 30, 50, 100))
    val items =
        listOf(
            "bundle" to values.amount(35.0, 70.0),
            "extra" to values.amount(0.0, 6.0),
            "discount" to -values.amount(0.0, 10.0),
        )
    val bill = Bill(values, values.pick(TELECOM_SUPPLIERS), "TELECOM", items, 21, "$gigabytes GB")
    return Draft(
        page {
            title(bill.supplier)
            line("Factura de servicios de telecomunicaciones")
            row("Nº de cliente", values.digits(9))
            row("Nº de factura", bill.number)
            row("Periodo de facturación", "${date(bill.start)} - ${date(bill.end)}")
            gap()
            row("Fibra 600 Mb + Móvil $gigabytes GB", money(items[0].second))
            row("Línea móvil 6${values.digits(2)} *** ${values.digits(3)}", "incluida")
            row("Llamadas y SMS fuera de tarifa", money(items[1].second))
            row("Descuento de permanencia", money(items[2].second))
            row("Cuota mensual", money(bill.base))
            row("IVA 21 %", money(bill.vat))
            row("Total a pagar", "${money(bill.total)} €")
            line("Domiciliado en ${values.maskedIban()}")
        },
        bill.truth(),
    )
}

internal fun summaryTelecomBill(values: Values): Draft {
    val gigabytes = values.pick(listOf(25, 50, 120))
    val items = listOf("internet" to values.amount(25.0, 45.0), "mobile" to values.amount(8.0, 20.0))
    val bill = Bill(values, values.pick(TELECOM_SUPPLIERS), "TELECOM", items, 21, "$gigabytes GB")
    return Draft(
        page {
            title("Resumen de tu factura")
            line(bill.supplier)
            row("Importe total", "${money(bill.total)} €")
            row("Periodo", "${date(bill.start)} al ${date(bill.end)}")
            gap()
            row("Internet fibra 1 Gb", money(items[0].second))
            row("Tarifa móvil $gigabytes GB con llamadas ilimitadas", money(items[1].second))
            row("Base imponible", money(bill.base))
            row("IVA", money(bill.vat))
            line("Consulta el detalle de tu consumo de datos y llamadas en tu área de cliente.")
        },
        bill.truth(),
    )
}
