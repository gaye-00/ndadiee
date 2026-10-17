package com.hautetech.ndadiee.common;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Pagination des listes qui se lisent page après page (vitrine, annonces). */
public final class Pageables {

    private Pageables() {
    }

    /**
     * Un ordre total : sans départage, deux lignes à égalité (zéro étoile, même date) pourraient changer de
     * place d'une page à l'autre, l'une vue deux fois, l'autre jamais. L'identifiant départage, le plus
     * récent d'abord.
     */
    public static Pageable inTotalOrder(Pageable pageable) {
        Sort sort = pageable.getSort();
        if (pageable.isUnpaged() || sort.getOrderFor("id") != null) {
            return pageable;
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort.and(Sort.by(Sort.Direction.DESC, "id")));
    }
}
