using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public record RequestCreateRequest(
        [param:Required, MaxLength(200)] string Title,
        [param:MaxLength(4000)] string? Description,
        Guid? NeedId
    );

    public record RequestUpdateRequest(
        [param:Required, MaxLength(200)] string Title,
        [param:MaxLength(4000)] string? Description,
        Guid? NeedId
    );

    public record RequestStatusChangeRequest(
        [param:Required, MaxLength(50)] string Status
    );

    /// <summary>
    /// Allows { approve: true/false } OR { value: 1/-1 }.
    /// If both are provided, 'value' wins.
    /// </summary>
    public record RequestVoteRequest(bool? Approve, int? Value);

    public record RequestResponse(
        Guid Id,
        string Title,
        string? Description,
        string Status,
        Guid? NeedId,
        Guid? CreatedByUserId,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        int VoteScore,
        int? MyVote
    );
}
