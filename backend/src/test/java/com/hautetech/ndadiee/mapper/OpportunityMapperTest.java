package com.hautetech.ndadiee.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import com.hautetech.ndadiee.model.opportunity.Opportunity;

/** Le lien de candidature d'une offre : jamais un lien qui ne mène nulle part (offres de démonstration). */
class OpportunityMapperTest {

    private final OpportunityMapper mapper = mapper();

    private static OpportunityMapper mapper() {
        OpportunityMapperImpl mapper = new OpportunityMapperImpl();
        ReflectionTestUtils.setField(mapper, "userMapper", Mockito.mock(UserMapper.class));
        ReflectionTestUtils.setField(mapper, "tagMapper", Mockito.mock(TagMapper.class));
        return mapper;
    }

    @Test
    void dropsAnApplyLinkOnAReservedDomain() {
        Opportunity demo = Opportunity.builder().title("Développeur·se backend").applyUrl("https://example.com/ndadiee-demo/candidature").build();

        assertThat(mapper.toResponse(demo).getApplyUrl()).isNull();
    }

    @Test
    void keepsARealApplyLink() {
        Opportunity real = Opportunity.builder().title("Android engineer").applyUrl("https://careers.jozi.co.za/android").build();

        assertThat(mapper.toResponse(real).getApplyUrl()).isEqualTo("https://careers.jozi.co.za/android");
    }
}
