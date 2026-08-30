namespace Prime.Api.DTOs;

public record SubmitForReviewRequest(string Notes);

public record ReviewActionRequest(string Action, string Notes); // Action: "approve" | "decline"

public record RequestSubmitRequest(string Notes);

public record InternalActionRequest(string Action, string Notes); // "approve" | "revise"

public record RequestRevisionRequest(string Notes); // Required notes

public record MarkOutcomeRequest(string Outcome, string Notes); // "WON" | "LOST"