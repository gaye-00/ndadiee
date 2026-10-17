package com.hautetech.ndadiee.initializer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.ExperienceLevel;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.repository.DeveloperRepository;

/** Les comptes d'essai existent toujours, avec le mot de passe de la configuration, haché en BCrypt. */
@ExtendWith(MockitoExtension.class)
class TestAccountsSeederTest {

    private static final String PASSWORD = "passer@123";

    @Mock
    private DemoAccounts accounts;

    @Mock
    private DeveloperRepository developerRepository;

    // Le vrai hachage : on vérifie ce qui partirait en base
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private TestAccountsSeeder seeder;

    @BeforeEach
    void setUp() {
        seeder = new TestAccountsSeeder(accounts, developerRepository, passwordEncoder);
        ReflectionTestUtils.setField(seeder, "password", PASSWORD);
    }

    private Developer account(long id, String hash) {
        Developer developer = Developer.builder().username("account-" + id).password(hash).build();
        developer.setId(id);
        when(developerRepository.findById(id)).thenReturn(Optional.of(developer));
        return developer;
    }

    private void accountsAre(long ada, long musa) {
        when(accounts.developer(eq("ada"), anyString(), eq(Role.USER), anyString(), anyString(), any(ExperienceLevel.class),
                any(Language.class), anyBoolean(), anyString(), any(String[].class))).thenReturn(ada);
        when(accounts.developer(eq("musa"), anyString(), eq(Role.USER), anyString(), anyString(), any(ExperienceLevel.class),
                any(Language.class), anyBoolean(), anyString(), any(String[].class))).thenReturn(musa);
    }

    @Test
    void accountsAlreadyUsingTheConfiguredPasswordAreLeftAlone() {
        accountsAre(1L, 2L);
        account(1L, passwordEncoder.encode(PASSWORD));
        account(2L, passwordEncoder.encode(PASSWORD));

        seeder.seed();

        verify(developerRepository, never()).save(any(Developer.class));
    }

    @Test
    void aStaleHashIsReplacedByABcryptHashOfTheConfiguredPassword() {
        accountsAre(1L, 2L);
        account(1L, passwordEncoder.encode("ancien-mot-de-passe"));
        account(2L, passwordEncoder.encode(PASSWORD));

        seeder.seed();

        ArgumentCaptor<Developer> saved = ArgumentCaptor.forClass(Developer.class);
        verify(developerRepository).save(saved.capture());
        String hash = saved.getValue().getPassword();
        // Jamais en clair : un hachage BCrypt, qui correspond au mot de passe configuré
        assertThat(hash).startsWith("$2a$").isNotEqualTo(PASSWORD);
        assertThat(passwordEncoder.matches(PASSWORD, hash)).isTrue();
    }
}
