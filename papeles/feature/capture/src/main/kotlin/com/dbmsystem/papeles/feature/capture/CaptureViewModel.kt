package com.dbmsystem.papeles.feature.capture

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dbmsystem.papeles.core.classify.Classification
import com.dbmsystem.papeles.core.classify.DocumentClassifier
import com.dbmsystem.papeles.core.model.DocumentType
import com.dbmsystem.papeles.core.model.Origin
import com.dbmsystem.papeles.core.model.TextPage
import com.dbmsystem.papeles.core.text.DocumentInput
import com.dbmsystem.papeles.core.text.DocumentReader
import com.dbmsystem.papeles.core.text.ReadFailure
import com.dbmsystem.papeles.core.text.ReadResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface CaptureState {
    data object Idle : CaptureState

    data object Reading : CaptureState

    /** The text was read but the type is unclear: the user picks among [Classification.options]. */
    data class AskType(
        val pages: List<TextPage>,
        val classification: Classification,
    ) : CaptureState

    data class Read(
        val pages: List<TextPage>,
        val classification: Classification,
        val type: DocumentType,
        /** DETECTED by the classifier or USER_CONFIRMED when the user picked it. */
        val typeOrigin: Origin,
    ) : CaptureState

    data class Problem(
        val problem: CaptureProblem,
    ) : CaptureState
}

enum class CaptureProblem {
    NO_TEXT,
    PASSWORD_PROTECTED,
    UNREADABLE,
    SCANNER_UNAVAILABLE,
}

@HiltViewModel
class CaptureViewModel
    @Inject
    constructor(
        private val reader: DocumentReader,
        private val classifier: DocumentClassifier,
    ) : ViewModel() {
        private val mutableState = MutableStateFlow<CaptureState>(CaptureState.Idle)
        val state: StateFlow<CaptureState> = mutableState.asStateFlow()

        fun read(input: DocumentInput) {
            if (mutableState.value == CaptureState.Reading) return
            mutableState.value = CaptureState.Reading
            viewModelScope.launch {
                mutableState.value =
                    when (val result = reader.read(input)) {
                        is ReadResult.Read ->
                            if (result.pages.all { it.blocks.isEmpty() }) {
                                CaptureState.Problem(CaptureProblem.NO_TEXT)
                            } else {
                                classified(result.pages)
                            }
                        is ReadResult.Failed ->
                            CaptureState.Problem(
                                when (result.reason) {
                                    ReadFailure.PASSWORD_PROTECTED -> CaptureProblem.PASSWORD_PROTECTED
                                    ReadFailure.UNREADABLE -> CaptureProblem.UNREADABLE
                                },
                            )
                    }
            }
        }

        /** The user's answer to "¿Qué es este documento?". */
        fun chooseType(type: DocumentType) {
            val asking = mutableState.value as? CaptureState.AskType ?: return
            mutableState.value = CaptureState.Read(asking.pages, asking.classification, type, Origin.USER_CONFIRMED)
        }

        private fun classified(pages: List<TextPage>): CaptureState {
            val classification = classifier.classify(pages)
            return if (classifier.needsUserChoice(classification)) {
                CaptureState.AskType(pages, classification)
            } else {
                CaptureState.Read(pages, classification, classification.type, Origin.DETECTED)
            }
        }

        fun scannerUnavailable() {
            mutableState.value = CaptureState.Problem(CaptureProblem.SCANNER_UNAVAILABLE)
        }

        fun reset() {
            mutableState.value = CaptureState.Idle
        }
    }
