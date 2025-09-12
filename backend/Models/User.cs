using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.Models
{
    public class User
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, EmailAddress, MaxLength(200)]
        public string Email { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string LastName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Role { get; set; } = "User";

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
