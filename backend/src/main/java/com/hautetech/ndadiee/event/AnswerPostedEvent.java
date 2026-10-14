package com.hautetech.ndadiee.event;

public record AnswerPostedEvent(Long answerId, Long questionId, Long questionAuthorId, Long answerAuthorId) {
}
