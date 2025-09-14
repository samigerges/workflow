using Microsoft.AspNetCore.Http;
namespace WorkflowBackend.Api.Controllers
{
    internal static class FileUploadValidator
    {
        public static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "application/pdf",
            "image/jpeg",
            "image/png",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
        };

        public const long MaxFileSize = 10 * 1024 * 1024; // 10 MB

        public static bool IsValid(IFormFile file, out string? error)
        {
            if (!AllowedContentTypes.Contains(file.ContentType))
            {
                error = "Unsupported file type.";
                return false;
            }
            if (file.Length > MaxFileSize)
            {
                error = "File too large.";
                return false;
            }
            error = null;
            return true;
        }
    }
}
