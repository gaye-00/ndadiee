package com.hautetech.ndadiee.authentication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.hautetech.ndadiee.authentication.UsernameAvailabilityResponse.Reason;
import com.hautetech.ndadiee.authentication.verification.EmailVerificationService;
import com.hautetech.ndadiee.exception.AccountBlockedException;
import com.hautetech.ndadiee.exception.BusinessException;
import com.hautetech.ndadiee.exception.EmailVerificationException;
import com.hautetech.ndadiee.exception.UnauthorizedException;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.repository.UserRepository;
import com.hautetech.ndadiee.security.JwtService;

/**
 * Inscription : le nom d'utilisateur se vérifie à la frappe, et chaque refus désigne son champ. Connexion : un
 * compte suspendu n'ouvre plus de session, ni ne la renouvelle.
 */
@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @Mock
    private UserMapper userMapper;

    @Mock
    private EmailVerificationService emailVerificationService;

    @InjectMocks
    private AuthenticationService authenticationService;

    private static RegisterRequest request(String username, String email) {
        return RegisterRequest.builder().username(username).email(email).password("tisse-ton-kente").fullName("Awa Diop").build();
    }

    @Test
    void aFreeUsernameIsAvailableAsItWouldBeStored() {
        when(userRepository.existsByUsername("awa_diop")).thenReturn(false);

        UsernameAvailabilityResponse response = authenticationService.checkUsername("  Awa_Diop ");

        assertThat(response.isAvailable()).isTrue();
        assertThat(response.getUsername()).isEqualTo("awa_diop");
        assertThat(response.getReason()).isNull();
        assertThat(response.getSuggestions()).isEmpty();
    }

    @Test
    void aTakenUsernameComesWithFreeVariantsThatFollowTheRule() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByUsername("awa")).thenReturn(true);

        UsernameAvailabilityResponse response = authenticationService.checkUsername("awa");

        assertThat(response.isAvailable()).isFalse();
        assertThat(response.getReason()).isEqualTo(Reason.TAKEN);
        assertThat(response.getSuggestions())
                .hasSize(AuthenticationService.SUGGESTIONS)
                .doesNotHaveDuplicates()
                .allSatisfy(suggestion -> assertThat(suggestion).startsWith("awa").matches("^[a-z0-9_]{3,30}$"));
    }

    @Test
    void variantsOfALongUsernameStayWithinThirtyCharacters() {
        String longName = "a".repeat(30);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByUsername(longName)).thenReturn(true);

        assertThat(authenticationService.checkUsername(longName).getSuggestions())
                .isNotEmpty()
                .allSatisfy(suggestion -> assertThat(suggestion).hasSizeLessThanOrEqualTo(30));
    }

    @Test
    void reservedAndInvalidUsernamesAreNotAvailable() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);

        assertThat(authenticationService.checkUsername("Admin").getReason()).isEqualTo(Reason.RESERVED);
        UsernameAvailabilityResponse invalid = authenticationService.checkUsername("a b");
        assertThat(invalid.getReason()).isEqualTo(Reason.INVALID);
        assertThat(invalid.getSuggestions()).isEmpty();
    }

    @Test
    void registeringWithATakenEmailPointsAtTheEmailField() {
        when(userRepository.findByEmail("awa@example.com")).thenReturn(Optional.of(Developer.builder().username("awa").build()));

        assertThatThrownBy(() -> authenticationService.register(request("awa", "Awa@Example.com")))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getField())
                .isEqualTo("email");
    }

    @Test
    void registeringWithAReservedUsernamePointsAtTheUsernameField() {
        assertThatThrownBy(() -> authenticationService.register(request("root", "awa@example.com")))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getField())
                .isEqualTo("username");
    }

    // ==================== COMPTE SUSPENDU ====================

    private static Developer member(Instant blockedAt) {
        Developer developer = Developer.builder().username("awa").role(Role.USER).blockedAt(blockedAt)
                .blockedReason(blockedAt == null ? null : "Spam répété").build();
        developer.setId(7L);
        return developer;
    }

    private void passwordAccepted(Developer developer) {
        when(authenticationManager.authenticate(any()))
                .thenReturn(new UsernamePasswordAuthenticationToken(developer, null, developer.getAuthorities()));
    }

    @Test
    void aSuspendedAccountLearnsWhyOnceItsPasswordIsRight() {
        passwordAccepted(member(Instant.now()));

        assertThatThrownBy(() -> authenticationService.login(new AuthenticationRequest("awa", "tisse-ton-kente")))
                .isInstanceOf(AccountBlockedException.class)
                .extracting(error -> ((AccountBlockedException) error).getReason())
                .isEqualTo("Spam répété");
        verify(jwtService, never()).generateAccessToken(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void anActiveAccountRecordsItsLastLogin() {
        Developer awa = member(null);
        passwordAccepted(awa);

        authenticationService.login(new AuthenticationRequest("awa", "tisse-ton-kente"));

        assertThat(awa.getLastLoginAt()).isNotNull();
        verify(userRepository).save(awa);
    }

    @Test
    void aSuspendedAccountCannotRenewItsSession() {
        when(jwtService.parseRefreshToken("refresh")).thenReturn(new JwtService.TokenClaims("awa", Instant.now()));
        when(userRepository.findByUsername("awa")).thenReturn(Optional.of(member(Instant.now())));

        assertThatThrownBy(() -> authenticationService.refreshToken(new RefreshTokenRequest("refresh")))
                .isInstanceOf(AccountBlockedException.class);
        verify(jwtService, never()).generateAccessToken(any());
    }

    @Test
    void aSessionOpenedBeforeAPasswordChangeCannotBeRenewed() {
        Developer awa = member(null);
        awa.setCredentialsChangedAt(Instant.parse("2026-11-10T10:00:00Z"));
        when(jwtService.parseRefreshToken("refresh"))
                .thenReturn(new JwtService.TokenClaims("awa", Instant.parse("2026-11-10T09:59:59Z")));
        when(userRepository.findByUsername("awa")).thenReturn(Optional.of(awa));

        assertThatThrownBy(() -> authenticationService.refreshToken(new RefreshTokenRequest("refresh")))
                .isInstanceOf(UnauthorizedException.class);
        verify(jwtService, never()).generateAccessToken(any());
    }

    @Test
    void aSessionOpenedAfterThePasswordChangeIsRenewed() {
        Developer awa = member(null);
        awa.setCredentialsChangedAt(Instant.parse("2026-11-10T10:00:00Z"));
        when(jwtService.parseRefreshToken("refresh"))
                .thenReturn(new JwtService.TokenClaims("awa", Instant.parse("2026-11-10T10:00:00Z")));
        when(userRepository.findByUsername("awa")).thenReturn(Optional.of(awa));

        authenticationService.refreshToken(new RefreshTokenRequest("refresh"));

        verify(jwtService).generateAccessToken(awa);
    }

    @Test
    void signingInAgainCancelsAScheduledDeletion() {
        Developer awa = member(null);
        awa.setDeletionScheduledAt(Instant.now().plusSeconds(3600));
        passwordAccepted(awa);

        AuthenticationResponse session = authenticationService.login(new AuthenticationRequest("awa", "tisse-ton-kente"));

        assertThat(session.isDeletionCancelled()).isTrue();
        assertThat(awa.getDeletionScheduledAt()).isNull();
        verify(userRepository).save(awa);
    }

    @Test
    void aDeletedAccountCannotOpenASession() {
        Developer gone = member(null);
        gone.setDeletedAt(Instant.now());

        assertThatThrownBy(() -> authenticationService.openSession(gone)).isInstanceOf(UnauthorizedException.class);
        verify(userRepository, never()).save(any());
    }

    // ==================== NOM D'UTILISATEUR TIRÉ DE GITHUB OU GOOGLE ====================

    @Test
    void aGithubLoginOrAnEmailBecomesAUsernameThatFollowsTheRule() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);

        assertThat(authenticationService.freeUsername("Awa-Diop")).isEqualTo("awa_diop");
        assertThat(authenticationService.freeUsername("aïssatou.ndiaye")).isEqualTo("aissatou_ndiaye");
        assertThat(authenticationService.freeUsername("--Kofi--")).isEqualTo("kofi");
        assertThat(authenticationService.freeUsername("ab")).isEqualTo("ab_dev");
        assertThat(authenticationService.freeUsername("李")).isEqualTo("dev");
        assertThat(authenticationService.freeUsername("a-very-long-github-login-that-goes-on-and-on"))
                .hasSizeLessThanOrEqualTo(30)
                .matches("^[a-z0-9_]{3,30}$")
                .doesNotEndWith("_");
    }

    @Test
    void aTakenOrReservedHintGetsAFreeVariant() {
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByUsername("awa")).thenReturn(true);

        assertThat(authenticationService.freeUsername("awa")).startsWith("awa").isNotEqualTo("awa").matches("^[a-z0-9_]{3,30}$");
        assertThat(authenticationService.freeUsername("Admin")).startsWith("admin").isNotEqualTo("admin");
    }

    @Test
    void openingASessionIsRefusedToASuspendedAccount() {
        Developer developer = Developer.builder().username("awa").role(Role.USER).blockedAt(Instant.now()).build();

        assertThatThrownBy(() -> authenticationService.openSession(developer)).isInstanceOf(AccountBlockedException.class);
        verify(userRepository, never()).save(any());
    }

    // ==================== CODE REÇU PAR E-MAIL ====================

    @Test
    void registeringCreatesAnUnconfirmedAccountAndSendsACodeWithoutOpeningASession() {
        when(userRepository.findByEmail("awa@example.com")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("awa")).thenReturn(false);
        when(passwordEncoder.encode("tisse-ton-kente")).thenReturn("{bcrypt}");
        when(userRepository.save(any(Developer.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(emailVerificationService.send(any())).thenReturn(60L);

        PendingVerificationResponse pending = authenticationService.register(request("Awa", "Awa@Example.com"));

        assertThat(pending.email()).isEqualTo("awa@example.com");
        assertThat(pending.resendAvailableInSeconds()).isEqualTo(60L);
        org.mockito.ArgumentCaptor<Developer> saved = org.mockito.ArgumentCaptor.forClass(Developer.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().isEmailVerified()).isFalse();
        verify(emailVerificationService).send(saved.getValue());
        verify(jwtService, never()).generateAccessToken(any());
    }

    @Test
    void registeringAgainWithTheSamePasswordSendsANewCode() {
        Developer pending = Developer.builder().username("awa").email("awa@example.com").password("{bcrypt}").emailVerified(false).build();
        when(userRepository.findByEmail("awa@example.com")).thenReturn(Optional.of(pending));
        when(passwordEncoder.matches("tisse-ton-kente", "{bcrypt}")).thenReturn(true);
        when(emailVerificationService.send(pending)).thenReturn(60L);

        assertThat(authenticationService.register(request("awa", "awa@example.com")).email()).isEqualTo("awa@example.com");
        verify(userRepository, never()).save(any());
    }

    @Test
    void nobodyCanTakeOverAnUnconfirmedRegistrationWithAnotherPassword() {
        Developer pending = Developer.builder().username("awa").email("awa@example.com").password("{bcrypt}").emailVerified(false).build();
        when(userRepository.findByEmail("awa@example.com")).thenReturn(Optional.of(pending));
        when(passwordEncoder.matches("tisse-ton-kente", "{bcrypt}")).thenReturn(false);

        assertThatThrownBy(() -> authenticationService.register(request("intrus", "awa@example.com")))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getField())
                .isEqualTo("email");
        verify(emailVerificationService, never()).send(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void anUnconfirmedAccountGetsANewCodeInsteadOfASession() {
        Developer awa = member(null);
        awa.setEmail("awa@example.com");
        awa.setEmailVerified(false);
        passwordAccepted(awa);

        assertThatThrownBy(() -> authenticationService.login(new AuthenticationRequest("awa", "tisse-ton-kente")))
                .isInstanceOf(EmailVerificationException.class)
                .extracting(error -> ((EmailVerificationException) error).getDetails().get("email"))
                .isEqualTo("awa@example.com");
        verify(emailVerificationService).send(awa);
        verify(jwtService, never()).generateAccessToken(any());
    }

    @Test
    void theRightCodeOpensTheSession() {
        Developer awa = member(null);
        when(emailVerificationService.verify("awa@example.com", "042917")).thenReturn(awa);
        when(jwtService.generateAccessToken(awa)).thenReturn("jwt");

        AuthenticationResponse session = authenticationService.verifyEmail(new VerifyEmailRequest(" Awa@Example.com ", "042917"));

        assertThat(session.getAccessToken()).isEqualTo("jwt");
        assertThat(awa.getLastLoginAt()).isNotNull();
    }

    @Test
    void resendingSaysNothingAboutUnknownAddresses() {
        when(userRepository.findByEmail("inconnu@example.com")).thenReturn(Optional.empty());

        PendingVerificationResponse response = authenticationService.resendVerification(new ResendVerificationRequest("inconnu@example.com"));

        assertThat(response.resendAvailableInSeconds()).isPositive();
        verify(emailVerificationService, never()).send(any());
    }
}
