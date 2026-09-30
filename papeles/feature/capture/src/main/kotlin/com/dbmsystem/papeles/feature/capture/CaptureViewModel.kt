package com.dbmsystem.papeles.feature.capture

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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

    data class Read(
        val pages: List<TextPage>,
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
                                CaptureState.Read(result.pages)
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

        fun scannerUnavailable() {
            mutableState.value = CaptureState.Problem(CaptureProblem.SCANNER_UNAVAILABLE)
        }

        fun reset() {
            mutableState.value = CaptureState.Idle
        }
    }
