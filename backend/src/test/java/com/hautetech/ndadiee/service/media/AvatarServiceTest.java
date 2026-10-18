package com.hautetech.ndadiee.service.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.service.media.ImageUploadService.ImageType;
import com.hautetech.ndadiee.service.media.ImageUploadService.StoredImage;
import com.hautetech.ndadiee.service.user.UserService;
import com.hautetech.ndadiee.storage.FileStorage;

/**
 * La photo de profil : rangée dans le dossier du membre, sans GIF ni plus d'1 Mo. L'ancienne n'est supprimée du
 * stockage qu'une fois le profil enregistré ; si l'enregistrement échoue, c'est la nouvelle qui part.
 */
@ExtendWith(MockitoExtension.class)
class AvatarServiceTest {

    private static final Long MEMBER = 12L;
    private static final String MEDIA = "https://media.example.com/";
    private static final MockMultipartFile PHOTO = new MockMultipartFile("file", "moi.webp", "image/webp", new byte[] { 1 });
    private static final StoredImage STORED = new StoredImage("avatars/12/neuve.webp", MEDIA + "avatars/12/neuve.webp", "image/webp", 1);

    @Mock
    private ImageUploadService imageUploadService;
    @Mock
    private FileStorage storage;
    @Mock
    private UserService userService;
    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private AvatarService service;

    private Developer member;

    @BeforeEach
    void setUp() {
        // Comme sous @Transactional : les actions d'après l'enregistrement attendent la fin de la transaction
        TransactionSynchronizationManager.initSynchronization();
        member = Developer.builder().id(MEMBER).username("ada").fullName("Ada Nwosu").build();
    }

    @AfterEach
    void tearDown() {
        TransactionSynchronizationManager.clearSynchronization();
    }

    // La transaction se termine : validée (STATUS_COMMITTED) ou annulée (STATUS_ROLLED_BACK)
    private static void complete(int status) {
        TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCompletion(status));
    }

    private void storageKnowsItsOwnAddresses() {
        when(storage.keyOf(anyString())).thenAnswer(call -> {
            String url = call.getArgument(0);
            return url.startsWith(MEDIA) ? Optional.of(url.substring(MEDIA.length())) : Optional.empty();
        });
    }

    @Test
    void aNewPhotoIsStoredInTheMemberFolderAndReplacesTheOldOneOnceSaved() {
        member.setAvatarUrl(MEDIA + "avatars/12/ancienne.webp");
        when(userService.getDeveloperOrThrow(MEMBER)).thenReturn(member);
        when(imageUploadService.store(eq(MEMBER), eq(PHOTO), eq("avatars/12"), eq(ImageType.STILL), eq(1024L * 1024)))
                .thenReturn(STORED);
        storageKnowsItsOwnAddresses();

        service.replace(MEMBER, PHOTO);

        assertThat(member.getAvatarUrl()).isEqualTo(STORED.url());
        // Rien n'est supprimé avant l'enregistrement du profil
        verify(storage, never()).delete(anyString());
        complete(TransactionSynchronization.STATUS_COMMITTED);
        verify(storage).delete("avatars/12/ancienne.webp");
        verify(storage, never()).delete(STORED.key());
    }

    @Test
    void ifTheProfileIsNotSavedTheNewPhotoIsRemovedAndTheOldOneKept() {
        member.setAvatarUrl(MEDIA + "avatars/12/ancienne.webp");
        when(userService.getDeveloperOrThrow(MEMBER)).thenReturn(member);
        when(imageUploadService.store(eq(MEMBER), eq(PHOTO), anyString(), eq(ImageType.STILL), eq(1024L * 1024))).thenReturn(STORED);
        storageKnowsItsOwnAddresses();

        service.replace(MEMBER, PHOTO);
        complete(TransactionSynchronization.STATUS_ROLLED_BACK);

        verify(storage).delete(STORED.key());
        verify(storage, never()).delete("avatars/12/ancienne.webp");
    }

    // Une adresse d'ailleurs, la photo d'un autre membre, une image du forum du membre
    @ParameterizedTest
    @ValueSource(strings = { "https://avatars.githubusercontent.com/u/1", MEDIA + "avatars/13/autre.webp",
            MEDIA + "forum/12/2026/10/image.webp", MEDIA + "avatars/123/homonyme.webp" })
    void onlyTheMembersOwnPhotosAreEverDeleted(String previous) {
        member.setAvatarUrl(previous);
        when(userService.getDeveloperOrThrow(MEMBER)).thenReturn(member);
        storageKnowsItsOwnAddresses();

        service.remove(MEMBER);
        complete(TransactionSynchronization.STATUS_COMMITTED);

        assertThat(member.getAvatarUrl()).isNull();
        verify(storage, never()).delete(anyString());
    }

    @Test
    void aRemovedPhotoLeavesTheStorageOnceSaved() {
        member.setAvatarUrl(MEDIA + "avatars/12/ancienne.webp");
        when(userService.getDeveloperOrThrow(MEMBER)).thenReturn(member);
        storageKnowsItsOwnAddresses();

        service.remove(MEMBER);

        assertThat(member.getAvatarUrl()).isNull();
        complete(TransactionSynchronization.STATUS_COMMITTED);
        verify(storage).delete("avatars/12/ancienne.webp");
    }

    @Test
    void aFailedDeletionDoesNotBreakTheProfile() {
        member.setAvatarUrl(MEDIA + "avatars/12/ancienne.webp");
        when(userService.getDeveloperOrThrow(MEMBER)).thenReturn(member);
        storageKnowsItsOwnAddresses();
        doThrow(new IllegalStateException("R2 indisponible")).when(storage).delete(anyString());

        service.remove(MEMBER);
        complete(TransactionSynchronization.STATUS_COMMITTED);

        assertThat(member.getAvatarUrl()).isNull();
    }

    @Test
    void anAdminAccountHasNoProfilePhoto() {
        when(userService.getDeveloperOrThrow(MEMBER)).thenThrow(new ForbiddenException("Réservé aux membres"));

        assertThatThrownBy(() -> service.replace(MEMBER, PHOTO)).isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(imageUploadService, storage);
    }
}
