# Backend (.NET 8) build and runtime with SQLite persistence
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
# Copy project sources (context should be backend/WorkflowBackend.Api)
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
# App uploads live under /app/wwwroot/uploads
ENV ASPNETCORE_URLS=http://+:8080
ENV ConnectionStrings__DefaultConnection=Host=postgres;Port=5432;Database=workflow;Username=workflow;Password=workflow
COPY --from=build /app/publish ./
# Ensure uploads directory exists
RUN mkdir -p /app/wwwroot/uploads
VOLUME ["/app/wwwroot/uploads"]
EXPOSE 8080
ENTRYPOINT ["dotnet", "WorkflowBackend.Api.dll"]
