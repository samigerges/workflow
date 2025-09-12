using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class RequestVote
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid RequestId { get; set; }
        public Request? Request { get; set; }

        [Required]
        public Guid UserId { get; set; }

        /// <summary>
        /// +1 for approve/upvote, -1 for reject/downvote
        /// </summary>
        [Range(-1, 1)]
        public int Value { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
