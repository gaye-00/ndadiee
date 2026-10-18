package com.hautetech.ndadiee.service.media;

import java.util.Optional;
import java.util.function.Consumer;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import com.hautetech.ndadiee.authentication.UserResponse;
import com.hautetech.ndadiee.mapper.UserMapper;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.service.media.ImageUploadService.ImageType;
import com.hautetech.ndadiee.service.media.ImageUploadService.StoredImage;
import com.hautetech.ndadiee.service.user.UserService;
import com.hautetech.ndadiee.storage.FileStorage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * La photo de profil d'un membre. Le navigateur l'a recadrée en carré et réduite (frontend : lib/avatarImage.ts) ;
 * ImageUploadService la vérifie et la range sous avatars/{membre}/, dans Cloudflare R2 en production.
 *
 * Le stockage n'est pas transactionnel : une photo remplacée ou retirée n'en est supprimée qu'une fois le profil
 * enregistré. Si l'enregistrement échoue, le profil garde l'ancienne, et c'est la nouvelle qui est supprimée.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class AvatarService {

    // Une photo préparée par le navigateur pèse moins de 100 Ko : un envoi plus lourd ne vient pas de l'application
    private static final long MAX_BYTES = DataSize.ofMegabytes(1).toBytes();

    private final ImageUploadService imageUploadService;
    private final FileStorage storage;
    private final UserService userService;
    private final UserMapper userMapper;

    /** Remplace la photo du membre : JPEG, PNG ou WebP, 1 Mo au plus. */
    public UserResponse replace(Long userId, MultipartFile file) {
        Developer developer = userService.getDeveloperOrThrow(userId);
        StoredImage image = imageUploadService.store(userId, file, folderOf(userId), ImageType.STILL, MAX_BYTES);
        Optional<String> previous = ownKey(developer.getAvatarUrl(), userId);
        developer.setAvatarUrl(image.url());

        afterCompletion(committed -> {
            if (committed) {
                previous.ifPresent(this::discard);
            } else {
                discard(image.key());
            }
        });
        log.info("[Avatar] Membre {} : nouvelle photo {}", userId, image.key());
        return userMapper.toUserResponse(developer);
    }

    /** Retire la photo du membre : ses initiales la remplacent. */
    public UserResponse remove(Long userId) {
        Developer developer = userService.getDeveloperOrThrow(userId);
        Optional<String> previous = ownKey(developer.getAvatarUrl(), userId);
        developer.setAvatarUrl(null);

        afterCompletion(committed -> {
            if (committed) {
                previous.ifPresent(this::discard);
            }
        });
        log.info("[Avatar] Membre {} : photo retirée", userId);
        return userMapper.toUserResponse(developer);
    }

    private static String folderOf(Long userId) {
        return "avatars/" + userId;
    }

    // La clé de la photo actuelle, si c'est bien un fichier de ce membre dans notre stockage : une adresse
    // d'ailleurs (un ancien profil) ou un autre fichier ne sont jamais supprimés
    private Optional<String> ownKey(String url, Long userId) {
        return storage.keyOf(url).filter(key -> key.startsWith(folderOf(userId) + "/"));
    }

    // Une suppression qui échoue laisse un fichier orphelin, pas un profil cassé : elle ne remonte pas
    private void discard(String key) {
        try {
            storage.delete(key);
        } catch (RuntimeException e) {
            log.warn("[Avatar] Suppression de {} impossible : {}", key, e.getMessage());
        }
    }

    // Une fois la transaction terminée : vrai si elle a été validée
    private static void afterCompletion(Consumer<Boolean> action) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                action.accept(status == STATUS_COMMITTED);
            }
        });
    }
}
