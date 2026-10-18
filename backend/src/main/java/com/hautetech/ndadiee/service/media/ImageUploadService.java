package com.hautetech.ndadiee.service.media;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.hautetech.ndadiee.dto.response.UploadResponse;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.UploadRejectedException;
import com.hautetech.ndadiee.service.user.UserService;
import com.hautetech.ndadiee.storage.FileStorage;
import com.hautetech.ndadiee.storage.StorageProperties;

import lombok.extern.slf4j.Slf4j;

/**
 * Les images que les membres insèrent dans le forum (sujets, réponses, commentaires).
 *
 * <ul>
 * <li>Le format se lit dans les premiers octets du fichier, pas dans son nom ni dans le type annoncé : seuls JPEG,
 * PNG, WebP et GIF passent. Jamais de SVG (il peut contenir du script).</li>
 * <li>Le navigateur a déjà réduit et réencodé l'image (frontend : lib/imageUpload.ts), ce qui retire ses
 * métadonnées (position GPS d'une photo). Le serveur garde la limite de taille.</li>
 * <li>Chaque fichier a une clé neuve et imprévisible : forum/{membre}/{année}/{mois}/{uuid}.{ext}. Le préfixe du
 * membre permet de retrouver ses fichiers (modération, suppression du compte).</li>
 * <li>Un nombre d'envois par membre et par heure, pour protéger le bucket. Compté en mémoire : par serveur.</li>
 * </ul>
 */
@Slf4j
@Service
public class ImageUploadService {

    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("yyyy/MM").withZone(ZoneOffset.UTC);
    private static final Duration WINDOW = Duration.ofHours(1);

    private final FileStorage storage;
    private final UserService userService;
    private final long maxBytes;
    private final int maxPerHour;
    private final Clock clock;
    // Les envois récents de chaque membre, du plus ancien au plus récent
    private final Map<Long, Deque<Instant>> recentUploads = new ConcurrentHashMap<>();

    @Autowired
    public ImageUploadService(FileStorage storage, UserService userService, StorageProperties properties) {
        this(storage, userService, properties, Clock.systemUTC());
    }

    // Pour les tests : une horloge arrêtée
    ImageUploadService(FileStorage storage, UserService userService, StorageProperties properties, Clock clock) {
        this.storage = storage;
        this.userService = userService;
        this.maxBytes = properties.maxImageSize().toBytes();
        this.maxPerHour = properties.maxUploadsPerHour();
        this.clock = clock;
    }

    public UploadResponse uploadImage(Long userId, MultipartFile file) {
        // Un compte développeur seulement : c'est lui qui écrit dans le forum
        userService.getDeveloperOrThrow(userId);
        if (file == null || file.isEmpty()) {
            throw new OperationNotAllowedException("Aucun fichier reçu");
        }
        if (file.getSize() > maxBytes) {
            throw UploadRejectedException.tooLarge(maxBytes / (1024 * 1024));
        }

        byte[] content = read(file);
        ImageType type = ImageType.detect(content).orElseThrow(UploadRejectedException::unsupported);
        reserveSlot(userId);

        String key = "forum/%d/%s/%s.%s".formatted(userId, MONTH.format(clock.instant()), UUID.randomUUID(), type.extension());
        String url = storage.store(key, content, type.contentType());
        log.info("[Upload] Membre {} : image {} ({} octets)", userId, key, content.length);
        return UploadResponse.builder().url(url).contentType(type.contentType()).size(content.length).build();
    }

    // Une place dans la fenêtre d'une heure, ou le refus
    private void reserveSlot(Long userId) {
        Instant now = clock.instant();
        Deque<Instant> uploads = recentUploads.computeIfAbsent(userId, id -> new ArrayDeque<>());
        synchronized (uploads) {
            while (!uploads.isEmpty() && uploads.peekFirst().isBefore(now.minus(WINDOW))) {
                uploads.pollFirst();
            }
            if (uploads.size() >= maxPerHour) {
                throw UploadRejectedException.tooMany(maxPerHour);
            }
            uploads.addLast(now);
        }
    }

    private static byte[] read(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Lecture du fichier envoyé impossible", e);
        }
    }

    /** Les formats acceptés, reconnus à leur signature (les premiers octets du fichier). */
    enum ImageType {
        JPEG("image/jpeg", "jpg", new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF }),
        PNG("image/png", "png", new byte[] { (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n' }),
        GIF("image/gif", "gif", new byte[] { 'G', 'I', 'F', '8' }),
        WEBP("image/webp", "webp", new byte[] { 'R', 'I', 'F', 'F' });

        private final String contentType;
        private final String extension;
        private final byte[] signature;

        ImageType(String contentType, String extension, byte[] signature) {
            this.contentType = contentType;
            this.extension = extension;
            this.signature = signature;
        }

        String contentType() {
            return contentType;
        }

        String extension() {
            return extension;
        }

        static Optional<ImageType> detect(byte[] content) {
            return Arrays.stream(values()).filter(type -> type.matches(content)).findFirst();
        }

        private boolean matches(byte[] content) {
            if (content.length < 12 || !Arrays.equals(content, 0, signature.length, signature, 0, signature.length)) {
                return false;
            }
            // RIFF est aussi l'enveloppe du WAV et de l'AVI : un WebP dit « WEBP » aux octets 8 à 11
            return this != WEBP || (content[8] == 'W' && content[9] == 'E' && content[10] == 'B' && content[11] == 'P');
        }
    }
}
