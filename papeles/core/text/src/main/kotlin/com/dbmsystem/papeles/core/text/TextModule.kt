package com.dbmsystem.papeles.core.text

import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
abstract class TextModule {
    @Binds
    abstract fun ocr(impl: MlKitOcr): Ocr

    @Binds
    abstract fun pageRenderer(impl: PdfPageRenderer): PageRenderer

    @Binds
    abstract fun documentReader(impl: LocalDocumentReader): DocumentReader

    companion object {
        @Provides
        fun config(): TextExtractionConfig = TextExtractionConfig()
    }
}
