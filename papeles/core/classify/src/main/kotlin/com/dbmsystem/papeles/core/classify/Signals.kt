package com.dbmsystem.papeles.core.classify

import com.dbmsystem.papeles.core.model.DocumentType
import com.dbmsystem.papeles.core.model.DocumentType.CONTRACT_DATES
import com.dbmsystem.papeles.core.model.DocumentType.INSURANCE
import com.dbmsystem.papeles.core.model.DocumentType.PAYSLIP
import com.dbmsystem.papeles.core.model.DocumentType.PURCHASE
import com.dbmsystem.papeles.core.model.DocumentType.SUBSCRIPTION
import com.dbmsystem.papeles.core.model.DocumentType.UTILITY_BILL
import com.dbmsystem.papeles.core.model.DocumentType.VEHICLE

/**
 * One piece of evidence for a type: a keyword or a structure. Patterns match the folded text of a block (lowercase,
 * no accents), except [raw] ones, which match the original text in uppercase (codes such as the CUPS).
 */
data class Signal(
    val id: String,
    val type: DocumentType,
    val weight: Float,
    val pattern: Regex,
    val raw: Boolean = false,
)

private fun signal(
    type: DocumentType,
    name: String,
    weight: Float,
    pattern: String,
    raw: Boolean = false,
) = Signal("classify.${type.name.lowercase()}.$name", type, weight, Regex("\\b(?:$pattern)"), raw)

/** Weights are hypotheses, tuned on the synthetic set (M9) and to be reviewed with real documents. */
val SIGNALS: List<Signal> =
    listOf(
        signal(PAYSLIP, "payslip", 2.5f, "nominas?\\b"),
        signal(PAYSLIP, "salary_receipt", 3f, "recibo (individual )?(justificativo )?(del pago )?de salarios"),
        signal(PAYSLIP, "earnings", 3f, "devengos?\\b|devengado"),
        signal(PAYSLIP, "net_pay", 3f, "liquido (total )?a percibir|neto a (cobrar|percibir)"),
        signal(PAYSLIP, "income_tax", 2f, "irpf|i\\.r\\.p\\.f\\.|renta de las personas fisicas"),
        signal(PAYSLIP, "common_contingencies", 2.5f, "contingencias comunes|cont\\. comunes"),
        signal(PAYSLIP, "social_security", 1.5f, "seguridad social|cotizacion|cot\\."),
        signal(PAYSLIP, "unemployment", 1.5f, "desempleo"),
        signal(PAYSLIP, "base_salary", 2f, "salario (base|bruto)"),
        signal(PAYSLIP, "settlement_period", 2f, "periodo de liquidacion"),
        signal(PAYSLIP, "worker", 1.5f, "trabajador|empleado|persona trabajadora"),
        signal(PAYSLIP, "affiliation", 1.5f, "afiliacion"),
        signal(PAYSLIP, "category", 1f, "grupo de cotizacion|categoria"),
        signal(PAYSLIP, "extra_pay", 1.5f, "pagas? extra"),
        signal(PAYSLIP, "total_deductions", 1.5f, "total (a deducir|deducciones)"),
        signal(UTILITY_BILL, "cups_code", 4f, "ES\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}\\s?[A-Z]{2}", raw = true),
        signal(UTILITY_BILL, "supply_point", 3f, "cups|punto de suministro|codigo de suministro"),
        signal(
            UTILITY_BILL,
            "electricity",
            2.5f,
            "factura de (luz|electricidad)|suministro electrico|energia (activa|consumida)",
        ),
        signal(UTILITY_BILL, "kwh", 2f, "kwh"),
        signal(UTILITY_BILL, "power", 2f, "potencia"),
        signal(UTILITY_BILL, "electricity_tax", 3f, "impuesto (sobre la )?electric(idad|o)"),
        signal(UTILITY_BILL, "hydrocarbons_tax", 3f, "hidrocarburos"),
        signal(UTILITY_BILL, "gas", 1.5f, "gas natural|tarifa de acceso"),
        signal(UTILITY_BILL, "meter_reading", 2f, "lectura (anterior|actual)"),
        signal(UTILITY_BILL, "meter", 1.5f, "contador|equipos? de medida"),
        signal(UTILITY_BILL, "cubic_metres", 1.5f, "\\d+ ?m[3³]"),
        signal(UTILITY_BILL, "water", 2f, "agua\\b|alcantarillado|saneamiento|abonado"),
        signal(UTILITY_BILL, "consumption", 1f, "consumo"),
        signal(UTILITY_BILL, "retailer", 2f, "comercializadora|distribuidora"),
        signal(UTILITY_BILL, "telecom", 2.5f, "telecomunicaciones"),
        signal(UTILITY_BILL, "fibre", 2f, "fibra"),
        signal(UTILITY_BILL, "mobile_line", 1.5f, "(linea|tarifa) movil|movil"),
        signal(UTILITY_BILL, "calls", 1.5f, "llamadas|sms"),
        signal(UTILITY_BILL, "data", 1.5f, "\\d+ ?gb\\b"),
        signal(UTILITY_BILL, "billing_period", 1.5f, "periodo de facturacion"),
        signal(UTILITY_BILL, "invoice", 1f, "factura"),
        signal(UTILITY_BILL, "iban", 0.5f, "iban|es\\d{2} [\\d*]{4}"),
        signal(SUBSCRIPTION, "subscription", 3f, "suscripcion|suscrito"),
        signal(
            SUBSCRIPTION,
            "auto_renewal",
            3f,
            "se renovara automaticamente|renovacion automatica|renueva automaticamente",
        ),
        signal(SUBSCRIPTION, "next_charge", 2.5f, "proximo (cargo|cobro|pago)"),
        signal(SUBSCRIPTION, "free_trial", 2.5f, "prueba gratuita|periodo de prueba"),
        signal(SUBSCRIPTION, "cancel_anytime", 2f, "cancelar en cualquier momento|darte de baja"),
        signal(SUBSCRIPTION, "plan", 1.5f, "plan (premium|basico|estandar|familiar|mensual|anual)|premium"),
        signal(SUBSCRIPTION, "recurring_price", 1.5f, "al (mes|ano)\\b|/ ?mes\\b"),
        signal(INSURANCE, "policy", 3f, "polizas?\\b"),
        signal(INSURANCE, "premium", 2.5f, "primas?\\b"),
        signal(INSURANCE, "policyholder", 3f, "tomador"),
        signal(INSURANCE, "insured", 2f, "asegurad[oa]s?\\b|aseguradora|seguros?\\b"),
        signal(INSURANCE, "cover", 2f, "coberturas?"),
        signal(INSURANCE, "deductible", 2f, "franquicia"),
        signal(INSURANCE, "branch", 2f, "ramo\\b"),
        signal(INSURANCE, "effect_date", 1.5f, "fecha de efecto|vencimiento"),
        signal(INSURANCE, "tacit_renewal", 1.5f, "tacitamente|renovacion tacita"),
        signal(INSURANCE, "broker", 1f, "mediador|corredor"),
        signal(VEHICLE, "itv", 4f, "itv\\b|inspeccion tecnica"),
        signal(VEHICLE, "number_plate", 2.5f, "matricula"),
        signal(VEHICLE, "chassis", 2.5f, "bastidor"),
        signal(VEHICLE, "registration", 2.5f, "permiso de circulacion|ficha tecnica"),
        signal(VEHICLE, "vehicle", 1.5f, "vehiculo|turismo|automovil|coche"),
        signal(VEHICLE, "workshop", 1.5f, "taller|revision (periodica|de mantenimiento)|mantenimiento"),
        signal(VEHICLE, "mileage", 1.5f, "\\d+[ .]?km\\b|kilometr(os|aje)"),
        signal(VEHICLE, "parts", 1.5f, "aceite|neumaticos|filtro"),
        signal(PURCHASE, "receipt", 3f, "ticket|factura simplificada"),
        signal(PURCHASE, "order", 2.5f, "pedido"),
        signal(PURCHASE, "serial_number", 2.5f, "n(umero|º|o)? de serie|imei"),
        signal(PURCHASE, "warranty", 2f, "garantia"),
        signal(PURCHASE, "returns", 2f, "devolucion(es)?"),
        signal(PURCHASE, "units", 1.5f, "uds?\\b|unidades|cantidad"),
        signal(PURCHASE, "shipping", 1.5f, "envio|entrega"),
        signal(PURCHASE, "item", 1.5f, "articulo|producto|tienda"),
        signal(PURCHASE, "vat_included", 1f, "iva incluido"),
        signal(PURCHASE, "cash", 1f, "efectivo|entregado"),
        signal(CONTRACT_DATES, "clauses", 3f, "clausulas?|estipulaciones?"),
        signal(CONTRACT_DATES, "parties", 3f, "las partes|reunidos|intervienen|exponen"),
        signal(CONTRACT_DATES, "lease", 2.5f, "arrendador|arrendatari[oa]|arrendamiento"),
        signal(CONTRACT_DATES, "term", 1.5f, "duracion|vigencia"),
        signal(CONTRACT_DATES, "notice", 2f, "preaviso|prorroga"),
        signal(CONTRACT_DATES, "signature", 2f, "en prueba de conformidad|firman|firmado en"),
        signal(CONTRACT_DATES, "subject", 2f, "objeto del contrato"),
        signal(CONTRACT_DATES, "contract", 1f, "contrato"),
    )
