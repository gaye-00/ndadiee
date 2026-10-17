package com.hautetech.ndadiee.authentication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.hautetech.ndadiee.authentication.UsernameAvailabilityResponse.Reason;
import com.hautetech.ndadiee.exception.BusinessException;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.repository.UserRepository;
import com.hautetech.ndadiee.security.JwtService;

/** Inscription : le nom d'utilisateur se vérifie à la frappe, et chaque refus désigne son champ. */
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
        when(userRepository.existsByUsername("awa")).thenReturn(false);
        when(userRepository.existsByEmail("awa@example.com")).thenReturn(true);

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
}
