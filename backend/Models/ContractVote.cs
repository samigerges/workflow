using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class ContractVote
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ContractId { get; set; }
        public Contract? Contract { get; set; }

        [Required]
        public Guid UserId { get; set; }

        /// <summary>
        /// +1 approve/upvote, -1 reject/downvote
        /// </summary>
        [Range(-1, 1)]
        public int Value { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
