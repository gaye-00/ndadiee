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
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.hautetech.ndadiee.dto.response.UploadResponse;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.UploadRejectedException;
import com.hautetech.ndadiee.model.media.UploadPurpose;
import com.hautetech.ndadiee.service.user.UserService;
import com.hautetech.ndadiee.storage.FileStorage;
import com.hautetech.ndadiee.storage.StorageProperties;

import lombok.extern.slf4j.Slf4j;

/**
 * Les images envoyées par les membres : celles qu'ils insèrent dans le forum (sujets, réponses, commentaires), les
 * couvertures et captures de leurs projets, et leur photo de profil (AvatarService).
 *
 * <ul>
 * <li>Le format se lit dans les premiers octets du fichier, pas dans son nom ni dans le type annoncé : seuls JPEG,
 * PNG, WebP et GIF passent. Jamais de SVG (il peut contenir du script).</li>
 * <li>Le navigateur a déjà réduit et réencodé l'image (frontend : lib/imageUpload.ts, lib/projectImages.ts), ce qui
 * retire ses métadonnées (position GPS d'une photo). Le serveur garde la limite de taille.</li>
 * <li>Chaque fichier a une clé neuve et imprévisible, sous un dossier propre au membre : forum/{membre}/{année}/{mois}/,
 * projects/{membre}/{année}/{mois}/, avatars/{membre}/. Le préfixe du membre permet de retrouver ses fichiers
 * (modération, suppression du compte).</li>
 * <li>Les images du forum et des projets sont inscrites à l'inventaire (MediaUploadService), qui supprime les images de
 * projet que plus rien ne montre. Une image de projet arrive avec sa miniature (640 px), sous la même clé suivie de
 * « -640 » : un seul envoi.</li>
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
    private final MediaUploadService mediaUploadService;
    private final long maxBytes;
    private final int maxPerHour;
    private final Clock clock;
    // Les envois récents de chaque membre, du plus ancien au plus récent
    private final Map<Long, Deque<Instant>> recentUploads = new ConcurrentHashMap<>();

    @Autowired
    public ImageUploadService(FileStorage storage, UserService userService, MediaUploadService mediaUploadService,
            StorageProperties properties) {
        this(storage, userService, mediaUploadService, properties, Clock.systemUTC());
    }

    // Pour les tests : une horloge arrêtée
    ImageUploadService(FileStorage storage, UserService userService, MediaUploadService mediaUploadService,
            StorageProperties properties, Clock clock) {
        this.storage = storage;
        this.userService = userService;
        this.mediaUploadService = mediaUploadService;
        this.maxBytes = properties.maxImageSize().toBytes();
        this.maxPerHour = properties.maxUploadsPerHour();
        this.clock = clock;
    }

    public UploadResponse uploadImage(Long userId, MultipartFile file) {
        // Un compte développeur seulement : c'est lui qui écrit dans le forum
        userService.getDeveloperOrThrow(userId);
        StoredImage image = store(userId, file, folderOf(UploadPurpose.FORUM, userId), ImageType.ALL, maxBytes);
        record(userId, UploadPurpose.FORUM, image);
        return UploadResponse.builder().url(image.url()).contentType(image.contentType()).size(image.size()).build();
    }

    /**
     * Une couverture ou une capture de projet (1280 px de côté au plus) et sa miniature (640 px), vérifiées toutes deux
     * avant d'être rangées : leurs adresses. Un seul envoi de l'heure. Elles restent à l'inventaire sans projet jusqu'à
     * la publication (MediaUploadService). Jamais de GIF : une couverture est fixe.
     */
    public UploadResponse uploadProjectImage(Long userId, MultipartFile file, MultipartFile thumbnail) {
        userService.getDeveloperOrThrow(userId);
        CheckedImage full = check(file, ImageType.STILL, maxBytes);
        CheckedImage small = check(thumbnail, ImageType.STILL, maxBytes);
        reserveSlot(userId);

        String name = "%s/%s".formatted(folderOf(UploadPurpose.PROJECT, userId), UUID.randomUUID());
        StoredImage image = put(userId, name, full);
        StoredImage miniature = put(userId, name + "-640", small);
        record(userId, UploadPurpose.PROJECT, image);
        record(userId, UploadPurpose.PROJECT, miniature);
        return UploadResponse.builder()
                .url(image.url())
                .thumbnailUrl(miniature.url())
                .contentType(image.contentType())
                .size(image.size())
                .build();
    }

    /**
     * Vérifie une image envoyée par un membre, puis la range sous ce dossier avec un nom neuf et imprévisible. Elle
     * compte dans ses envois de l'heure.
     *
     * @param folder   dossier du stockage, propre au membre, sans barre finale (« avatars/12 »)
     * @param accepted les formats acceptés ici
     * @param limit    poids maximal, en octets ; jamais plus que la limite de la configuration
     */
    StoredImage store(Long userId, MultipartFile file, String folder, Set<ImageType> accepted, long limit) {
        CheckedImage image = check(file, accepted, limit);
        reserveSlot(userId);
        return put(userId, "%s/%s".formatted(folder, UUID.randomUUID()), image);
    }

    // Un fichier reçu, lu et reconnu : une image d'un format accepté ici, sous la limite de poids
    private CheckedImage check(MultipartFile file, Set<ImageType> accepted, long limit) {
        if (file == null || file.isEmpty()) {
            throw new OperationNotAllowedException("Aucun fichier reçu");
        }
        long allowed = Math.min(limit, maxBytes);
        if (file.getSize() > allowed) {
            throw UploadRejectedException.tooLarge(Math.max(1, allowed / (1024 * 1024)));
        }

        byte[] content = read(file);
        ImageType type = ImageType.detect(content)
                .filter(accepted::contains)
                .orElseThrow(() -> UploadRejectedException.unsupported(ImageType.describe(accepted)));
        return new CheckedImage(content, type);
    }

    // Range l'image sous ce nom (son extension ajoutée)
    private StoredImage put(Long userId, String name, CheckedImage image) {
        String key = "%s.%s".formatted(name, image.type().extension());
        String url = storage.store(key, image.content(), image.type().contentType());
        log.info("[Upload] Membre {} : image {} ({} octets)", userId, key, image.content().length);
        return new StoredImage(key, url, image.type().contentType(), image.content().length);
    }

    private void record(Long userId, UploadPurpose purpose, StoredImage image) {
        mediaUploadService.record(userId, purpose, image.key(), image.url(), image.contentType(), image.size());
    }

    // {forum|projects}/{membre}/{année}/{mois}
    private String folderOf(UploadPurpose purpose, Long userId) {
        return "%s/%d/%s".formatted(purpose.keyPrefix(), userId, MONTH.format(clock.instant()));
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

    /** Une image rangée dans le stockage : sa clé, son adresse publique, son format et son poids en octets. */
    record StoredImage(String key, String url, String contentType, long size) {
    }

    // Une image reçue et reconnue, pas encore rangée
    private record CheckedImage(byte[] content, ImageType type) {
    }

    /** Les formats acceptés, reconnus à leur signature (les premiers octets du fichier). */
    enum ImageType {
        JPEG("JPEG", "image/jpeg", "jpg", new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF }),
        PNG("PNG", "image/png", "png", new byte[] { (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n' }),
        WEBP("WebP", "image/webp", "webp", new byte[] { 'R', 'I', 'F', 'F' }),
        GIF("GIF", "image/gif", "gif", new byte[] { 'G', 'I', 'F', '8' });

        /** Tous les formats : les images du forum */
        static final Set<ImageType> ALL = Set.of(values());
        /** Sans le GIF, qui peut être animé : une photo de profil est fixe */
        static final Set<ImageType> STILL = Set.of(JPEG, PNG, WEBP);

        private final String label;
        private final String contentType;
        private final String extension;
        private final byte[] signature;

        ImageType(String label, String contentType, String extension, byte[] signature) {
            this.label = label;
            this.contentType = contentType;
            this.extension = extension;
            this.signature = signature;
        }

        /** « JPEG, PNG, WebP et GIF » : les formats d'un envoi, pour le message qui en refuse un autre */
        static String describe(Set<ImageType> types) {
            List<String> labels = Arrays.stream(values()).filter(types::contains).map(type -> type.label).toList();
            if (labels.size() < 2) {
                return String.join("", labels);
            }
            return String.join(", ", labels.subList(0, labels.size() - 1)) + " et " + labels.get(labels.size() - 1);
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
