package com.hautetech.ndadiee.service.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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
import com.hautetech.ndadiee.model.media.UploadPurpose;
import com.hautetech.ndadiee.service.media.ImageUploadService.ImageType;
import com.hautetech.ndadiee.service.media.ImageUploadService.StoredImage;
import com.hautetech.ndadiee.service.user.UserService;
import com.hautetech.ndadiee.storage.FileStorage;
import com.hautetech.ndadiee.storage.StorageProperties;

/**
 * Images du forum, des projets et des profils : seuls les vrais formats d'image passent, dans la limite de taille et
 * d'envois par heure ; celles du forum et des projets sont inscrites à l'inventaire.
 */
@ExtendWith(MockitoExtension.class)
class ImageUploadServiceTest {

    private static final Long MEMBER = 12L;
    private static final byte[] PNG = withHeader(new byte[] { (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n' });
    private static final byte[] WEBP = withHeader(new byte[] { 'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P' });

    @Mock
    private FileStorage storage;

    @Mock
    private UserService userService;

    @Mock
    private MediaUploadService mediaUploadService;

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
        StorageProperties properties = new StorageProperties(StorageProperties.Provider.LOCAL, "uploads", DataSize.ofKilobytes(1), 2, null, null);
        Clock clock = Clock.fixed(Instant.parse("2026-10-18T09:00:00Z"), ZoneOffset.UTC);
        service = new ImageUploadService(storage, userService, mediaUploadService, properties, clock);
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
        assertThat(response.getThumbnailUrl()).isNull();
        verify(mediaUploadService).record(MEMBER, UploadPurpose.FORUM, key.getValue(), response.getUrl(), "image/webp", WEBP.length);
    }

    @Test
    void aProjectImageArrivesWithItsThumbnailInOneUpload() {
        when(storage.store(anyString(), any(), anyString())).thenAnswer(call -> "https://media.example.com/" + call.getArgument(0));

        UploadResponse response = service.uploadProjectImage(MEMBER, file(WEBP, "cover.webp", "image/webp"),
                new MockMultipartFile("thumbnail", "cover-640.png", "image/png", PNG));

        ArgumentCaptor<String> keys = ArgumentCaptor.forClass(String.class);
        verify(storage, times(2)).store(keys.capture(), any(), anyString());
        String full = keys.getAllValues().get(0);
        assertThat(full).matches("projects/12/2026/10/[0-9a-f-]{36}\\.webp");
        // La miniature : la même clé, suivie de « -640 », avec l'extension de son propre format
        assertThat(keys.getAllValues().get(1)).isEqualTo(full.replace(".webp", "-640.png"));
        assertThat(response.getUrl()).isEqualTo("https://media.example.com/" + full);
        assertThat(response.getThumbnailUrl()).isEqualTo("https://media.example.com/" + full.replace(".webp", "-640.png"));
        verify(mediaUploadService).record(eq(MEMBER), eq(UploadPurpose.PROJECT), eq(full), anyString(), eq("image/webp"), eq((long) WEBP.length));
        verify(mediaUploadService).record(eq(MEMBER), eq(UploadPurpose.PROJECT), eq(full.replace(".webp", "-640.png")), anyString(),
                eq("image/png"), eq((long) PNG.length));
    }

    @Test
    void aProjectImageWithoutAValidThumbnailIsRefusedBeforeAnythingIsStored() {
        byte[] svg = withHeader("<svg xmlns=".getBytes());

        assertThatThrownBy(() -> service.uploadProjectImage(MEMBER, file(WEBP, "cover.webp", "image/webp"),
                new MockMultipartFile("thumbnail", "thumb.png", "image/png", svg)))
                .isInstanceOf(UploadRejectedException.class);
        verify(storage, never()).store(anyString(), any(), anyString());
    }

    @Test
    void aProjectImageCountsAsOneUpload() {
        when(storage.store(anyString(), any(), anyString())).thenReturn("https://media.example.com/x.webp");
        service.uploadProjectImage(MEMBER, file(WEBP, "1.webp", "image/webp"), file(WEBP, "1-640.webp", "image/webp"));
        service.uploadProjectImage(MEMBER, file(WEBP, "2.webp", "image/webp"), file(WEBP, "2-640.webp", "image/webp"));

        assertThatThrownBy(() -> service.uploadProjectImage(MEMBER, file(WEBP, "3.webp", "image/webp"), file(WEBP, "3-640.webp", "image/webp")))
                .extracting("status").isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
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
    void aStillImageCannotBeAGif() {
        byte[] gif = withHeader(new byte[] { 'G', 'I', 'F', '8', '9', 'a' });

        assertThatThrownBy(() -> service.store(MEMBER, file(gif, "danse.gif", "image/gif"), "avatars/12", ImageType.STILL, 1024))
                .isInstanceOf(UploadRejectedException.class)
                .hasMessage("Formats acceptés : JPEG, PNG et WebP");
        verify(storage, never()).store(anyString(), any(), anyString());
    }

    @Test
    void anUploadCanBeLighterThanTheConfiguredLimitButNeverHeavier() {
        when(storage.store(anyString(), any(), anyString())).thenAnswer(call -> "https://media.example.com/" + call.getArgument(0));
        byte[] medium = Arrays.copyOf(PNG, 600);

        assertThatThrownBy(() -> service.store(MEMBER, file(medium, "moi.png", "image/png"), "avatars/12", ImageType.STILL, 512))
                .isInstanceOf(UploadRejectedException.class)
                .extracting("status").isEqualTo(HttpStatus.CONTENT_TOO_LARGE);
        // Au-delà de la limite de la configuration (1 Ko ici), c'est elle qui compte
        assertThatThrownBy(() -> service.store(MEMBER, file(Arrays.copyOf(PNG, 2048), "moi.png", "image/png"), "avatars/12",
                ImageType.STILL, 1024 * 1024))
                .isInstanceOf(UploadRejectedException.class);

        StoredImage image = service.store(MEMBER, file(medium, "moi.png", "image/png"), "avatars/12", ImageType.STILL, 1024);
        assertThat(image.key()).matches("avatars/12/[0-9a-f-]{36}\\.png");
        assertThat(image.url()).isEqualTo("https://media.example.com/" + image.key());
        assertThat(image.size()).isEqualTo(600);
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
