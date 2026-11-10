package com.hautetech.ndadiee.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** example.com, .test, .invalid… n'appartiennent à personne : ni e-mail ni lien n'y aboutit. */
class ReservedDomainsTest {

    @Test
    void recognisesReservedDomainsAndTheirSubdomains() {
        assertThat(ReservedDomains.isReserved("example.com")).isTrue();
        assertThat(ReservedDomains.isReserved("Demo.Example.ORG")).isTrue();
        assertThat(ReservedDomains.isReserved("api.test")).isTrue();
        assertThat(ReservedDomains.isReserved("localhost")).isTrue();
        assertThat(ReservedDomains.isReserved("ndadiee.com")).isFalse();
        // Seul le domaine exact compte : « example.com » n'est qu'une partie de ce nom
        assertThat(ReservedDomains.isReserved("myexample.com")).isFalse();
        assertThat(ReservedDomains.isReserved(null)).isFalse();
    }

    @Test
    void aLinkOnAReservedDomainLeadsNowhere() {
        assertThat(ReservedDomains.isDeadLink("https://example.com/ndadiee-demo/candidature")).isTrue();
        assertThat(ReservedDomains.isDeadLink("not a url")).isTrue();
        assertThat(ReservedDomains.isDeadLink("https://jobs.teranga.sn/backend")).isFalse();
        // Pas de lien du tout : rien de mort
        assertThat(ReservedDomains.isDeadLink(null)).isFalse();
        assertThat(ReservedDomains.isDeadLink(" ")).isFalse();
    }
}
