package com.hautetech.ndadiee.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.core.convert.converter.ConverterFactory;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverterFactory(new CaseInsensitiveEnumConverterFactory());
    }

    /**
     * Accepte les enums des paramètres d'URL sans tenir compte de la casse :
     * ?type=job comme ?type=JOB, ?language=fr comme ?language=FR.
     */
    @SuppressWarnings({ "rawtypes", "unchecked" })
    private static class CaseInsensitiveEnumConverterFactory implements ConverterFactory<String, Enum> {

        @Override
        public <T extends Enum> Converter<String, T> getConverter(Class<T> targetType) {
            return source -> source.isBlank() ? null : (T) Enum.valueOf(targetType, source.trim().toUpperCase());
        }
    }
}
