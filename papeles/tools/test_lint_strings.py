import tempfile
import unittest
from pathlib import Path

from lint_strings import check_text, scan


class CheckTextTest(unittest.TestCase):
    def test_accepts_fixed_interface_texts(self):
        for text in (
            "Hemos detectado una diferencia que quizá quieras revisar.",
            "El documento parece indicar una renovación el %1$s. Fuente: página %2$d.",
            "%1$s se renueva en %2$d días. Precio detectado: %3$s.",
            "¿Ha llegado tu nómina de %1$s?",
            "Confirmada por ti",
        ):
            self.assertEqual(check_text(text), [], text)

    def test_flags_forbidden_words_in_any_case_and_accent(self):
        for text in ("Hay un ERROR", "Reclama ahora", "Es ilegal", "Debes revisarlo",
                     "Deberías revisarlo", "Parece un fraude", "Cláusula abusiva", "Errores"):
            self.assertTrue(check_text(text), text)

    def test_flags_missing_accents_as_whole_words(self):
        self.assertTrue(check_text("Tu nomina de octubre"))
        self.assertTrue(check_text("Fecha de renovacion"))
        self.assertTrue(check_text("Plazo de devolucion"))
        self.assertTrue(check_text("Contrasena"))
        self.assertEqual(check_text("Nóminas y renovaciones"), [])

    def test_flags_wrong_accent(self):
        self.assertTrue(check_text("Tu fáctura"))
        self.assertEqual(check_text("Tu factura"), [])

    def test_flags_mojibake(self):
        self.assertTrue(check_text("nÃ³mina"))


class ScanTest(unittest.TestCase):
    def write(self, root, relative, content):
        path = Path(root, relative)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def test_reports_resources_and_hardcoded_ui_text(self):
        with tempfile.TemporaryDirectory() as root:
            self.write(root, "app/src/main/res/values/strings.xml",
                       '<resources><string name="ok">Sube tus documentos</string>'
                       '<string name="bad">Revisa tu nomina</string>'
                       '<plurals name="days"><item quantity="one">%d dia</item></plurals></resources>')
            self.write(root, "app/build/generated/res/values/strings.xml",
                       '<resources><string name="ignored">error</string></resources>')
            self.write(root, "feature/today/src/main/kotlin/Today.kt",
                       'Text(stringResource(R.string.ok))\nText("Hola")\nIcon(x, contentDescription = null)\n')
            problems = scan(root)
        self.assertEqual(len(problems), 3, problems)
        self.assertIn("[bad]", problems[0])
        self.assertIn("[days[one]]", problems[1])
        self.assertIn("Today.kt:2", problems[2])

    def test_clean_project_passes(self):
        with tempfile.TemporaryDirectory() as root:
            self.write(root, "app/src/main/res/values/strings.xml",
                       '<resources><string name="ok">Sube tus documentos</string></resources>')
            self.assertEqual(scan(root), [])


if __name__ == "__main__":
    unittest.main()
