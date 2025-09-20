using System.ComponentModel.DataAnnotations;
using WorkflowBackend.Api.DTOs;
using WorkflowBackend.Api.Models;
using Xunit;

namespace WorkflowBackend.Tests;

public class ContractRequestValidationTests
{
    private static bool TryValidate(object instance, out List<ValidationResult> results)
    {
        var context = new ValidationContext(instance);
        results = new List<ValidationResult>();
        return Validator.TryValidateObject(instance, context, results, true);
    }

    private static ContractCreateRequest CreateRequest(
        string? description = null,
        string? contractTerms = null,
        string? reviewNotes = null)
    {
        return new ContractCreateRequest(
            Title: "Test Contract",
            Description: description,
            RequestId: null,
            SupplierName: "Acme Corp",
            Quantity: null,
            CargoType: "Steel",
            CountryOfOrigin: null,
            PricePerTon: null,
            PaymentMethod: null,
            ShippingMethod: null,
            ContractTerms: contractTerms,
            StartDate: null,
            EndDate: null,
            ReviewNotes: reviewNotes
        );
    }

    [Fact]
    public void CreateRequest_AllowsVeryLongNarratives()
    {
        var longBlock = new string('A', Contract.NarrativeMaxLength);
        var request = CreateRequest(longBlock, longBlock, new string('B', Contract.ReviewNotesMaxLength));

        var isValid = TryValidate(request, out var results);

        Assert.True(isValid);
        Assert.Empty(results);
    }

    [Theory]
    [InlineData(nameof(ContractCreateRequest.Description))]
    [InlineData(nameof(ContractCreateRequest.ContractTerms))]
    [InlineData(nameof(ContractCreateRequest.ReviewNotes))]
    public void CreateRequest_RejectsNarrativesBeyondMaxLength(string field)
    {
        var overLimit = new string('C', Contract.NarrativeMaxLength + 1);
        var overLimitReview = new string('D', Contract.ReviewNotesMaxLength + 1);

        ContractCreateRequest request = field switch
        {
            nameof(ContractCreateRequest.Description) => CreateRequest(overLimit, null, null),
            nameof(ContractCreateRequest.ContractTerms) => CreateRequest(null, overLimit, null),
            nameof(ContractCreateRequest.ReviewNotes) => CreateRequest(null, null, overLimitReview),
            _ => throw new ArgumentOutOfRangeException(nameof(field))
        };

        var isValid = TryValidate(request, out var results);

        Assert.False(isValid);
        Assert.Contains(results, r => r.MemberNames.Contains(field));
    }
}
