package com.hautetech.ndadiee.event;

public record AnswerAcceptedEvent(Long answerId, Long questionId, Long answerAuthorId, Long questionAuthorId) {
}
