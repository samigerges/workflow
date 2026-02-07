# Backend (.NET 8) build and runtime with SQLite persistence
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files and restore dependencies first for better layer caching
COPY WorkflowBackend.Api.csproj ./
RUN dotnet restore WorkflowBackend.Api.csproj --disable-parallel

# Copy the remaining source code
COPY . .
RUN dotnet publish WorkflowBackend.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
# App uploads live under /app/wwwroot/uploads
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=build /app/publish ./
# Ensure uploads directory exists
RUN mkdir -p /app/wwwroot/uploads
VOLUME ["/app/wwwroot/uploads"]
EXPOSE 8080
ENTRYPOINT ["dotnet", "WorkflowBackend.Api.dll"]
