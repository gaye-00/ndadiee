package com.hautetech.ndadiee.security;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Duration;
import java.util.Base64;

import org.junit.jupiter.api.Test;

class JwtServiceConfigurationTest {

    @Test
    void rejectsBlankSecret() {
        assertThrows(IllegalStateException.class, () -> new JwtService(
                " ",
                Duration.ofMinutes(30),
                Duration.ofDays(30)));
    }

    @Test
    void rejectsInvalidBase64Secret() {
        assertThrows(IllegalStateException.class, () -> new JwtService(
                "not-base64!",
                Duration.ofMinutes(30),
                Duration.ofDays(30)));
    }

    @Test
    void rejectsSecretShorterThan256Bits() {
        assertThrows(IllegalStateException.class, () -> new JwtService(
                Base64.getEncoder().encodeToString(new byte[31]),
                Duration.ofMinutes(30),
                Duration.ofDays(30)));
    }

    @Test
    void acceptsBase64SecretWithAtLeast256Bits() {
        assertDoesNotThrow(() -> new JwtService(
                Base64.getEncoder().encodeToString(new byte[32]),
                Duration.ofMinutes(30),
                Duration.ofDays(30)));
    }
}
