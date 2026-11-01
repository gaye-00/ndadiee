package com.hautetech.ndadiee.service.github;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.hautetech.ndadiee.exception.GithubException;
import com.hautetech.ndadiee.github.GithubClient;
import com.hautetech.ndadiee.github.GithubClient.PullRequestChecks;
import com.hautetech.ndadiee.github.GithubClient.PullRequestFile;
import com.hautetech.ndadiee.model.review.PullRequest;

/**
 * Ce que GitHub garde d'une pull request synchronisée, lu au moment de la revue : ses fichiers modifiés et leur diff,
 * ses vérifications, les issues qu'elle ferme. Rien n'est copié en base : le code reste sur GitHub.
 *
 * Le diff à un commit donné ne change plus : il est gardé une demi-heure, pour tous les relecteurs. Les
 * vérifications tournent : une minute. Une erreur de GitHub (introuvable, quota, injoignable) n'est pas gardée.
 */
@Service
public class GithubPullRequestReader {

    // Fichiers lus au plus : trois pages de l'API. Au-delà, la page renvoie vers GitHub
    static final int MAX_FILE_PAGES = 3;
    // Vérifications lues au plus
    static final int MAX_CHECKS = 50;
    static final Duration FILES_TTL = Duration.ofMinutes(30);
    // Sans commit connu (PR pas encore relue depuis l'ajout de la colonne), le diff peut changer
    static final Duration FILES_WITHOUT_SHA_TTL = Duration.ofMinutes(2);
    static final Duration CHECKS_TTL = Duration.ofMinutes(1);
    private static final int MAX_ENTRIES = 200;

    /** L'adresse d'une PR sur GitHub : https://github.com/owner/name/pull/84 */
    private static final Pattern PULL_REQUEST_URL = Pattern.compile("^https://github\\.com/([^/]+)/([^/]+)/pull/\\d+/?$");

    private final GithubClient client;
    private final ExpiringCache<List<PullRequestFile>> files;
    private final ExpiringCache<List<PullRequestFile>> filesWithoutSha;
    private final ExpiringCache<PullRequestChecks> checks;

    @Autowired
    public GithubPullRequestReader(GithubClient client) {
        this(client, Clock.systemUTC());
    }

    // Pour les tests : une horloge arrêtée
    GithubPullRequestReader(GithubClient client, Clock clock) {
        this.client = client;
        this.files = new ExpiringCache<>(FILES_TTL, MAX_ENTRIES, clock);
        this.filesWithoutSha = new ExpiringCache<>(FILES_WITHOUT_SHA_TTL, MAX_ENTRIES, clock);
        this.checks = new ExpiringCache<>(CHECKS_TTL, MAX_ENTRIES, clock);
    }

    /** Le dépôt d'une PR synchronisée : « owner/name » ; vide pour une PR de démonstration. */
    public static Optional<String> repositoryOf(PullRequest pullRequest) {
        if (pullRequest.getGithubUrl() == null) {
            return Optional.empty();
        }
        Matcher matcher = PULL_REQUEST_URL.matcher(pullRequest.getGithubUrl());
        return matcher.matches() ? Optional.of(matcher.group(1) + "/" + matcher.group(2)) : Optional.empty();
    }

    /** Les fichiers modifiés et leur diff, au dernier commit de la branche (MAX_FILE_PAGES pages de 100 au plus). */
    public List<PullRequestFile> files(PullRequest pullRequest) {
        String[] repository = repositoryParts(pullRequest);
        String key = repository[0] + "/" + repository[1] + "#" + pullRequest.getNumber();
        if (pullRequest.getHeadSha() == null) {
            return filesWithoutSha.get(key, () -> client.pullRequestFiles(repository[0], repository[1], pullRequest.getNumber(), MAX_FILE_PAGES));
        }
        return files.get(key + "@" + pullRequest.getHeadSha(),
                () -> client.pullRequestFiles(repository[0], repository[1], pullRequest.getNumber(), MAX_FILE_PAGES));
    }

    /** Les vérifications du dernier commit et les issues que la PR ferme (MAX_CHECKS vérifications au plus). */
    public PullRequestChecks checks(PullRequest pullRequest) {
        String[] repository = repositoryParts(pullRequest);
        return checks.get(repository[0] + "/" + repository[1] + "#" + pullRequest.getNumber(),
                () -> client.pullRequestChecks(repository[0], repository[1], pullRequest.getNumber(), MAX_CHECKS));
    }

    /** Le jeton est configuré : les vérifications et les issues (GraphQL) se lisent. */
    public boolean canReadChecks() {
        return client.authenticated();
    }

    private static String[] repositoryParts(PullRequest pullRequest) {
        // Une PR synchronisée a toujours son adresse ; une adresse illisible se traite comme une PR introuvable
        return repositoryOf(pullRequest).map(name -> name.split("/", 2)).orElseThrow(GithubException::notFound);
    }
}
