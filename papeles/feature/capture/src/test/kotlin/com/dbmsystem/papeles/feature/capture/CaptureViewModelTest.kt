package com.dbmsystem.papeles.feature.capture

import android.net.Uri
import com.dbmsystem.papeles.core.model.BoundingBox
import com.dbmsystem.papeles.core.model.TextBlock
import com.dbmsystem.papeles.core.model.TextPage
import com.dbmsystem.papeles.core.model.TextSource
import com.dbmsystem.papeles.core.text.DocumentInput
import com.dbmsystem.papeles.core.text.DocumentReader
import com.dbmsystem.papeles.core.text.ReadFailure
import com.dbmsystem.papeles.core.text.ReadResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CaptureViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val pdf = DocumentInput.Pdf(Uri.parse("content://test/nomina.pdf"))
    private var result: ReadResult = ReadResult.Read(emptyList())
    private var reads = 0
    private val viewModel =
        CaptureViewModel(
            object : DocumentReader {
                override suspend fun read(input: DocumentInput): ReadResult {
                    reads++
                    return result
                }
            },
        )

    @Before
    fun setUp() = Dispatchers.setMain(dispatcher)

    @After
    fun tearDown() = Dispatchers.resetMain()

    private fun page(vararg lines: String) =
        TextPage(1, TextSource.OCR, lines.map { TextBlock(it, BoundingBox(0f, 0f, 1f, 0.1f), 0.9f) })

    @Test
    fun `shows the pages that were read`() =
        runTest(dispatcher) {
            result = ReadResult.Read(listOf(page("Nómina de septiembre")))
            viewModel.read(pdf)
            assertEquals(CaptureState.Reading, viewModel.state.value)
            advanceUntilIdle()
            assertEquals(CaptureState.Read(listOf(page("Nómina de septiembre"))), viewModel.state.value)
        }

    @Test
    fun `an image without text is not taken as a document`() =
        runTest(dispatcher) {
            result = ReadResult.Read(listOf(page()))
            viewModel.read(pdf)
            advanceUntilIdle()
            assertEquals(CaptureState.Problem(CaptureProblem.NO_TEXT), viewModel.state.value)
        }

    @Test
    fun `read failures become problems the screen can explain`() =
        runTest(dispatcher) {
            result = ReadResult.Failed(ReadFailure.PASSWORD_PROTECTED)
            viewModel.read(pdf)
            advanceUntilIdle()
            assertEquals(CaptureState.Problem(CaptureProblem.PASSWORD_PROTECTED), viewModel.state.value)

            result = ReadResult.Failed(ReadFailure.UNREADABLE)
            viewModel.read(pdf)
            advanceUntilIdle()
            assertEquals(CaptureState.Problem(CaptureProblem.UNREADABLE), viewModel.state.value)
        }

    @Test
    fun `a second document is ignored while one is being read`() =
        runTest(dispatcher) {
            viewModel.read(pdf)
            viewModel.read(pdf)
            advanceUntilIdle()
            assertEquals(1, reads)
        }

    @Test
    fun `reset goes back to the start`() {
        viewModel.scannerUnavailable()
        assertEquals(CaptureState.Problem(CaptureProblem.SCANNER_UNAVAILABLE), viewModel.state.value)
        viewModel.reset()
        assertEquals(CaptureState.Idle, viewModel.state.value)
    }
}
