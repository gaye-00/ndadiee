package com.hautetech.ndadiee.service.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;

import com.hautetech.ndadiee.dto.response.UploadResponse;
import com.hautetech.ndadiee.exception.UploadRejectedException;
import com.hautetech.ndadiee.service.user.UserService;
import com.hautetech.ndadiee.storage.FileStorage;
import com.hautetech.ndadiee.storage.StorageProperties;

/** Images du forum : seuls les vrais formats d'image passent, dans la limite de taille et d'envois par heure. */
@ExtendWith(MockitoExtension.class)
class ImageUploadServiceTest {

    private static final Long MEMBER = 12L;
    private static final byte[] PNG = withHeader(new byte[] { (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n' });
    private static final byte[] WEBP = withHeader(new byte[] { 'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P' });

    @Mock
    private FileStorage storage;

    @Mock
    private UserService userService;

    private ImageUploadService service;

    private static byte[] withHeader(byte[] header) {
        byte[] content = Arrays.copyOf(header, 64);
        Arrays.fill(content, header.length, content.length, (byte) 7);
        return content;
    }

    private static MockMultipartFile file(byte[] content, String name, String declaredType) {
        return new MockMultipartFile("file", name, declaredType, content);
    }

    @BeforeEach
    void setUp() {
        StorageProperties properties = new StorageProperties(StorageProperties.Provider.LOCAL, "uploads", DataSize.ofKilobytes(1), 2, null);
        Clock clock = Clock.fixed(Instant.parse("2026-10-18T09:00:00Z"), ZoneOffset.UTC);
        service = new ImageUploadService(storage, userService, properties, clock);
    }

    @Test
    void anImageIsStoredUnderAFreshKeyOfItsAuthor() {
        when(storage.store(anyString(), any(), anyString())).thenAnswer(call -> "https://media.example.com/" + call.getArgument(0));

        UploadResponse response = service.uploadImage(MEMBER, file(WEBP, "photo.webp", "image/webp"));

        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        verify(storage).store(key.capture(), eq(WEBP), eq("image/webp"));
        assertThat(key.getValue()).matches("forum/12/2026/10/[0-9a-f-]{36}\\.webp");
        assertThat(response.getUrl()).isEqualTo("https://media.example.com/" + key.getValue());
        assertThat(response.getContentType()).isEqualTo("image/webp");
    }

    @Test
    void theFormatIsReadFromTheBytesNotFromTheName() {
        when(storage.store(anyString(), any(), anyString())).thenReturn("https://media.example.com/x.png");

        // Un PNG nommé .jpg et annoncé en JPEG reste un PNG
        UploadResponse response = service.uploadImage(MEMBER, file(PNG, "capture.jpg", "image/jpeg"));

        assertThat(response.getContentType()).isEqualTo("image/png");
    }

    @Test
    void aFileThatIsNotAnImageIsRefused() {
        byte[] svg = withHeader("<svg xmlns=".getBytes());

        assertThatThrownBy(() -> service.uploadImage(MEMBER, file(svg, "logo.png", "image/png")))
                .isInstanceOf(UploadRejectedException.class)
                .extracting("status").isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        verify(storage, never()).store(anyString(), any(), anyString());
    }

    @Test
    void aTooHeavyImageIsRefused() {
        byte[] heavy = Arrays.copyOf(PNG, 2048);

        assertThatThrownBy(() -> service.uploadImage(MEMBER, file(heavy, "big.png", "image/png")))
                .isInstanceOf(UploadRejectedException.class)
                .extracting("status").isEqualTo(HttpStatus.CONTENT_TOO_LARGE);
    }

    @Test
    void uploadsAreLimitedPerHour() {
        when(storage.store(anyString(), any(), anyString())).thenReturn("https://media.example.com/x.png");
        service.uploadImage(MEMBER, file(PNG, "1.png", "image/png"));
        service.uploadImage(MEMBER, file(PNG, "2.png", "image/png"));

        assertThatThrownBy(() -> service.uploadImage(MEMBER, file(PNG, "3.png", "image/png")))
                .isInstanceOf(UploadRejectedException.class)
                .extracting("status").isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        // Un autre membre n'est pas concerné
        service.uploadImage(13L, file(PNG, "4.png", "image/png"));
    }
}
