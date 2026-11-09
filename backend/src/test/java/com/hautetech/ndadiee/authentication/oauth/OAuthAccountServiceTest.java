package com.hautetech.ndadiee.authentication.oauth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.hautetech.ndadiee.authentication.AuthenticationResponse;
import com.hautetech.ndadiee.authentication.AuthenticationService;
import com.hautetech.ndadiee.authentication.verification.EmailVerificationService;
import com.hautetech.ndadiee.exception.OAuthException;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.user.Admin;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.OAuthProvider;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.model.user.User;
import com.hautetech.ndadiee.model.user.UserIdentity;
import com.hautetech.ndadiee.repository.UserIdentityRepository;
import com.hautetech.ndadiee.repository.UserRepository;

/**
 * Au retour de GitHub ou Google, le compte se retrouve par son identité reliée, sinon par l'adresse vérifiée (et
 * l'identité y est reliée), sinon il est créé. Sans adresse vérifiée, ou pour un compte d'administration : refusé.
 */
@ExtendWith(MockitoExtension.class)
class OAuthAccountServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserIdentityRepository identityRepository;

    @Mock
    private AuthenticationService authenticationService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailVerificationService emailVerificationService;

    @InjectMocks
    private OAuthAccountService accounts;

    private static final AuthenticationResponse SESSION = AuthenticationResponse.builder().accessToken("jwt").build();

    private static OAuthProfile github(String email) {
        return new OAuthProfile(OAuthProvider.GITHUB, "583231", email, "Awa Diop", "Awa-Diop",
                "https://avatars.githubusercontent.com/u/583231?v=4", "https://github.com/Awa-Diop");
    }

    private static Developer developer(Long id, String email) {
        Developer developer = Developer.builder().username("awa").email(email).role(Role.USER).build();
        developer.setId(id);
        return developer;
    }

    @Test
    void aLinkedIdentityOpensItsAccountWithoutCreatingAnything() {
        Developer awa = developer(7L, "awa@example.com");
        UserIdentity identity = UserIdentity.builder().user(awa).provider(OAuthProvider.GITHUB).subject("583231").build();
        when(identityRepository.findByProviderAndSubject(OAuthProvider.GITHUB, "583231")).thenReturn(Optional.of(identity));
        when(authenticationService.openSession(awa)).thenReturn(SESSION);

        AuthenticationResponse session = accounts.signIn(github("Awa@Example.com"), Language.FR);

        assertThat(session).isSameAs(SESSION);
        assertThat(identity.getEmail()).isEqualTo("awa@example.com");
        verify(userRepository, never()).save(any());
        verify(identityRepository, never()).save(any());
    }

    @Test
    void aVerifiedEmailOfAnExistingMemberLinksTheIdentityAndFillsOnlyWhatIsMissing() {
        Developer awa = developer(7L, "awa@example.com");
        awa.setAvatarUrl("https://cdn.ndadiee.com/avatars/awa.webp");
        when(identityRepository.findByProviderAndSubject(OAuthProvider.GITHUB, "583231")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("awa@example.com")).thenReturn(Optional.of(awa));
        when(identityRepository.existsByUserIdAndProvider(7L, OAuthProvider.GITHUB)).thenReturn(false);
        when(authenticationService.openSession(awa)).thenReturn(SESSION);

        accounts.signIn(github("AWA@example.com"), Language.FR);

        ArgumentCaptor<UserIdentity> linked = ArgumentCaptor.forClass(UserIdentity.class);
        verify(identityRepository).save(linked.capture());
        assertThat(linked.getValue().getUser()).isSameAs(awa);
        assertThat(linked.getValue().getSubject()).isEqualTo("583231");
        // Sa propre photo est gardée ; son GitHub, qu'il n'avait pas renseigné, est ajouté
        assertThat(awa.getAvatarUrl()).isEqualTo("https://cdn.ndadiee.com/avatars/awa.webp");
        assertThat(awa.getGithubUrl()).isEqualTo("https://github.com/Awa-Diop");
        verify(userRepository, never()).save(any());
    }

    @Test
    void aNewMemberGetsAnAccountWithAFreeUsernameInTheirLanguage() {
        when(identityRepository.findByProviderAndSubject(OAuthProvider.GITHUB, "583231")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("awa@example.com")).thenReturn(Optional.empty());
        when(authenticationService.freeUsername("Awa-Diop")).thenReturn("awa_diop");
        when(passwordEncoder.encode(anyString())).thenReturn("{bcrypt}");
        when(userRepository.save(any(Developer.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(authenticationService.openSession(any())).thenReturn(SESSION);

        accounts.signIn(github("awa@example.com"), Language.EN);

        ArgumentCaptor<Developer> created = ArgumentCaptor.forClass(Developer.class);
        verify(userRepository).save(created.capture());
        Developer awa = created.getValue();
        assertThat(awa.getUsername()).isEqualTo("awa_diop");
        assertThat(awa.getEmail()).isEqualTo("awa@example.com");
        assertThat(awa.getFullName()).isEqualTo("Awa Diop");
        assertThat(awa.getPassword()).isEqualTo("{bcrypt}");
        assertThat(awa.getPreferredLanguage()).isEqualTo(Language.EN);
        assertThat(awa.getRole()).isEqualTo(Role.USER);
        assertThat(awa.getGithubUrl()).isEqualTo("https://github.com/Awa-Diop");
        assertThat(awa.getAvatarUrl()).startsWith("https://avatars.githubusercontent.com/");
        verify(identityRepository).save(any(UserIdentity.class));
    }

    @Test
    void aGoogleMemberWithoutANameIsNamedAfterTheirEmail() {
        OAuthProfile google = new OAuthProfile(OAuthProvider.GOOGLE, "1098", "kofi.mensah@gmail.com", null, null, null, null);
        when(identityRepository.findByProviderAndSubject(OAuthProvider.GOOGLE, "1098")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("kofi.mensah@gmail.com")).thenReturn(Optional.empty());
        when(authenticationService.freeUsername("kofi.mensah")).thenReturn("kofi_mensah");
        when(userRepository.save(any(Developer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        accounts.signIn(google, null);

        ArgumentCaptor<Developer> created = ArgumentCaptor.forClass(Developer.class);
        verify(userRepository).save(created.capture());
        assertThat(created.getValue().getFullName()).isEqualTo("kofi_mensah");
        assertThat(created.getValue().getPreferredLanguage()).isEqualTo(Language.FR);
        assertThat(created.getValue().getGithubUrl()).isNull();
    }

    @Test
    void withoutAVerifiedEmailNothingIsFoundNorCreated() {
        when(identityRepository.findByProviderAndSubject(OAuthProvider.GITHUB, "583231")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> accounts.signIn(github(null), Language.FR))
                .isInstanceOf(OAuthException.class)
                .extracting("errorCode").isEqualTo("OAUTH_EMAIL_REQUIRED");
        verify(userRepository, never()).save(any());
        verify(identityRepository, never()).save(any());
        verify(authenticationService, never()).openSession(any());
    }

    @Test
    void anAdministrationAccountOnlyOpensWithItsPassword() {
        User admin = Admin.builder().username("ops").email("ops@ndadiee.com").role(Role.ADMIN).build();
        when(identityRepository.findByProviderAndSubject(OAuthProvider.GITHUB, "583231")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("ops@ndadiee.com")).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> accounts.signIn(github("ops@ndadiee.com"), Language.FR))
                .isInstanceOf(OAuthException.class)
                .extracting("errorCode").isEqualTo("OAUTH_ADMIN_ACCOUNT");
        verify(identityRepository, never()).save(any());
        verify(authenticationService, never()).openSession(any());
    }

    @Test
    void anAccountAlreadyLinkedToAnotherGithubAccountIsNotLinkedTwice() {
        Developer awa = developer(7L, "awa@example.com");
        when(identityRepository.findByProviderAndSubject(OAuthProvider.GITHUB, "583231")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("awa@example.com")).thenReturn(Optional.of(awa));
        when(identityRepository.existsByUserIdAndProvider(7L, OAuthProvider.GITHUB)).thenReturn(true);

        assertThatThrownBy(() -> accounts.signIn(github("awa@example.com"), Language.FR))
                .isInstanceOf(OAuthException.class)
                .extracting("errorCode").isEqualTo("OAUTH_ACCOUNT_CONFLICT");
        verify(identityRepository, never()).save(any());
    }

    @Test
    void anUnconfirmedRegistrationWithThisAddressIsConfirmedAndItsUnknownPasswordReplaced() {
        Developer pending = developer(7L, "awa@example.com");
        pending.setPassword("{mot de passe choisi par un inconnu}");
        pending.setEmailVerified(false);
        when(identityRepository.findByProviderAndSubject(OAuthProvider.GITHUB, "583231")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("awa@example.com")).thenReturn(Optional.of(pending));
        when(identityRepository.existsByUserIdAndProvider(7L, OAuthProvider.GITHUB)).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("{secret aléatoire}");

        accounts.signIn(github("awa@example.com"), Language.FR);

        assertThat(pending.isEmailVerified()).isTrue();
        assertThat(pending.getPassword()).isEqualTo("{secret aléatoire}");
        verify(emailVerificationService).discard(pending);
        verify(identityRepository).save(any(UserIdentity.class));
    }
}
