using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class Request
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(4000)]
        public string? Description { get; set; }

        public RequestStatus Status { get; set; } = RequestStatus.Draft; // Draft, Submitted, Approved, Rejected, Archived

        // Optional link to a Need
        public Guid? NeedId { get; set; }
        public Need? Need { get; set; }

        public Guid? CreatedByUserId { get; set; }
        public User? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<RequestVote> Votes { get; set; } = new List<RequestVote>();
    }
}
