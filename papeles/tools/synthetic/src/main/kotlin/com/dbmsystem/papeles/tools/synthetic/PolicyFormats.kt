package com.dbmsystem.papeles.tools.synthetic

private val INSURERS = listOf("Aseguradora Brisa", "Mutua Horizonte Seguros", "Seguros Alcor")

/** Health cover is left out on purpose (CLAUDE.md, rule 6). */
private val INSURANCE_KINDS = listOf("Hogar", "Automóvil", "Vida", "Decesos", "Responsabilidad civil")
private val SERVICES = listOf("Cinemix Premium", "Sonora Música", "Nube Plus Almacenamiento", "Lectoria Libros")

internal fun insuranceRenewal(values: Values): Draft {
    val insurer = values.pick(INSURERS)
    val kind = values.pick(INSURANCE_KINDS)
    val effect = values.month().atDay(values.int(1, 29))
    val expiry = effect.plusYears(1)
    val net = values.amount(120.0, 900.0)
    val taxes = round2(net * 0.08)
    val total = round2(net + taxes)
    val deductible = values.pick(listOf(0, 150, 300, 600))
    return Draft(
        page {
            title(insurer)
            line("Aviso de renovación de su póliza")
            row("Póliza nº", "${values.digits(3)}-${values.digits(7)}")
            row("Ramo", kind)
            row("Tomador", values.person())
            row("Asegurado", "El tomador")
            row("Fecha de efecto", date(effect))
            row("Fecha de vencimiento", date(expiry))
            gap()
            row("Prima neta", money(net))
            row("Impuestos y recargos", money(taxes))
            row("Prima total anual", "${money(total)} €")
            row("Forma de pago", "Anual, domiciliada")
            row("Franquicia", if (deductible == 0) "Sin franquicia" else "$deductible €")
            gap()
            line("Coberturas principales")
            line("Responsabilidad civil · Defensa jurídica · Asistencia 24 horas")
            line("La póliza se renovará tácitamente salvo comunicación con un mes de antelación.")
        },
        mapOf(
            "company" to insurer,
            "kind" to kind,
            "price" to truthAmount(total),
            "renewalDate" to expiry.toString(),
            "deductible" to deductible.toString(),
        ),
    )
}

internal fun subscriptionReceipt(values: Values): Draft {
    val service = values.pick(SERVICES)
    val yearly = values.chance(0.3)
    val price = if (yearly) values.amount(49.0, 120.0) else values.amount(3.99, 17.99)
    val start = values.month().atDay(values.int(1, 29))
    val trial = values.chance(0.4)
    val next =
        if (trial) {
            start.plusDays(30)
        } else if (yearly) {
            start.plusYears(1)
        } else {
            start.plusMonths(1)
        }
    return Draft(
        page {
            title(service)
            line("Confirmación de tu suscripción")
            row("Plan", if (yearly) "Premium anual" else "Premium mensual")
            row("Precio", if (yearly) "${money(price)} € al año" else "${money(price)} € al mes")
            row("Fecha de alta", date(start))
            if (trial) line("Prueba gratuita de 30 días hasta el ${date(next)}")
            row("Próximo cargo", date(next))
            row("Método de pago", "Tarjeta **** ${values.digits(4)}")
            gap()
            line("Tu suscripción se renovará automáticamente.")
            line("Puedes cancelar en cualquier momento desde tu cuenta.")
        },
        mapOf(
            "name" to service,
            "price" to truthAmount(price),
            "periodicity" to if (yearly) "YEARLY" else "MONTHLY",
            "nextRenewal" to next.toString(),
            "trial" to trial.toString(),
        ),
    )
}
