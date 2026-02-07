using System.ComponentModel.DataAnnotations;

namespace WorkflowBackend.Api.DTOs
{
    public record RegisterRequest(
        [param:Required, EmailAddress] string Email,
        [param:Required, MinLength(2), MaxLength(100)] string FirstName,
        [param:Required, MinLength(2), MaxLength(100)] string LastName,
        [param:Required, MinLength(6), MaxLength(100)] string Password
    );

    public record LoginRequest(
        [param:Required, EmailAddress] string Email,
        [param:Required, MinLength(6), MaxLength(100)] string Password
    );

    public record UserResponse(Guid Id, string Email, string FirstName, string LastName, string Role);

    public record ChangeRoleRequest(
        [param:Required, MaxLength(50)] string Role
    );
}
