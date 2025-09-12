using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkflowBackend.Api.Data;

namespace WorkflowBackend.Api.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _db;
        public DashboardController(AppDbContext db) => _db = db;

        [HttpGet("stats")]
        public async Task<IActionResult> Stats()
        {
            var body = new
            {
                needs = await _db.Needs.CountAsync(),
                requests = await _db.Requests.CountAsync(),
                contracts = await _db.Contracts.CountAsync(),
                vessels = await _db.Vessels.CountAsync(),
                lettersOfCredit = await _db.LettersOfCredit.CountAsync(),
                shipments = await _db.Shipments.CountAsync()
            };
            return Ok(body);
        }
    }
}
