package com.hautetech.ndadiee.service.opportunity;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.OpportunityRequest;
import com.hautetech.ndadiee.dto.response.OpportunityResponse;
import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.OpportunityMapper;
import com.hautetech.ndadiee.model.opportunity.Opportunity;
import com.hautetech.ndadiee.model.opportunity.OpportunityType;
import com.hautetech.ndadiee.model.opportunity.WorkMode;
import com.hautetech.ndadiee.model.user.User;
import com.hautetech.ndadiee.repository.OpportunityRepository;
import com.hautetech.ndadiee.repository.specification.OpportunitySpecifications;
import com.hautetech.ndadiee.service.content.TagService;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class OpportunityService {

    private final OpportunityRepository opportunityRepository;
    private final UserService userService;
    private final TagService tagService;
    private final OpportunityMapper opportunityMapper;

    /**
     * @param includeClosed false (par défaut côté API) : seulement les opportunités actives
     *                      dont la date limite n'est pas dépassée
     */
    @Transactional(readOnly = true)
    public PageResponse<OpportunityResponse> list(String q, OpportunityType type, WorkMode workMode,
            String country, String tag, boolean includeClosed, Pageable pageable) {
        Page<Opportunity> page = opportunityRepository.findAll(
                OpportunitySpecifications.filter(q, type, workMode, country, tag, !includeClosed), pageable);
        return PageResponse.from(page.map(opportunityMapper::toResponse));
    }

    @Transactional(readOnly = true)
    public OpportunityResponse getById(Long opportunityId) {
        return opportunityMapper.toResponse(findOpportunityOrThrow(opportunityId));
    }

    /** Ouvert à tous les comptes : un membre comme un admin peut publier une opportunité. */
    public OpportunityResponse create(Long userId, OpportunityRequest request) {
        User postedBy = userService.findUserOrThrow(userId);

        Opportunity opportunity = Opportunity.builder().postedBy(postedBy).build();
        applyRequest(opportunity, request);

        Opportunity saved = opportunityRepository.save(opportunity);
        log.info("[Opportunity] Créée - ID: {} - type: {}", saved.getId(), saved.getType());
        return opportunityMapper.toResponse(saved);
    }

    public OpportunityResponse update(Long userId, Long opportunityId, OpportunityRequest request) {
        Opportunity opportunity = findOpportunityOrThrow(opportunityId);
        requirePosterOrModerator(opportunity, userId, "Vous ne pouvez modifier que vos propres opportunités");

        applyRequest(opportunity, request);
        log.info("[Opportunity] ID: {} mise à jour par {}", opportunityId, userId);
        return opportunityMapper.toResponse(opportunityRepository.save(opportunity));
    }

    /** Clôture (poste pourvu) ou rouvre une opportunité sans la supprimer. */
    public OpportunityResponse setActive(Long userId, Long opportunityId, boolean active) {
        Opportunity opportunity = findOpportunityOrThrow(opportunityId);
        requirePosterOrModerator(opportunity, userId, "Vous ne pouvez clôturer que vos propres opportunités");

        opportunity.setActive(active);
        log.info("[Opportunity] ID: {} - active: {} par {}", opportunityId, active, userId);
        return opportunityMapper.toResponse(opportunityRepository.save(opportunity));
    }

    public void delete(Long userId, Long opportunityId) {
        Opportunity opportunity = findOpportunityOrThrow(opportunityId);
        requirePosterOrModerator(opportunity, userId, "Vous ne pouvez supprimer que vos propres opportunités");

        tagService.releaseTags(opportunity.getTags());
        opportunityRepository.delete(opportunity);
        log.info("[Opportunity] ID: {} supprimée par {}", opportunityId, userId);
    }

    // ==================== HELPERS ====================

    private Opportunity findOpportunityOrThrow(Long opportunityId) {
        return opportunityRepository.findById(opportunityId)
                .orElseThrow(() -> new ResourceNotFoundException("Opportunité", opportunityId));
    }

    private void requirePosterOrModerator(Opportunity opportunity, Long userId, String message) {
        if (!opportunity.getPostedBy().getId().equals(userId) && !userService.canModerate(userId)) {
            throw new ForbiddenException(message);
        }
    }

    private void applyRequest(Opportunity opportunity, OpportunityRequest request) {
        opportunity.setTitle(request.getTitle().trim());
        opportunity.setDescription(request.getDescription());
        opportunity.setCompanyName(request.getCompanyName().trim());
        opportunity.setCompanyLogoUrl(request.getCompanyLogoUrl());
        opportunity.setType(request.getType());
        opportunity.setWorkMode(request.getWorkMode());
        opportunity.setCountry(request.getCountry() == null ? null : request.getCountry().toUpperCase());
        opportunity.setCity(request.getCity());
        opportunity.setSalaryRange(request.getSalaryRange());
        opportunity.setApplyUrl(request.getApplyUrl());
        opportunity.setDeadline(request.getDeadline());
        tagService.replaceTags(opportunity.getTags(), request.getTags());
    }
}
