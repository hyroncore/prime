FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
# Render provides PORT environment variable, default to 8080
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Install Node.js for frontend build
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

COPY ["Prime.Api/Prime.Api.csproj", "Prime.Api/"]
RUN dotnet restore "Prime.Api/Prime.Api.csproj"
COPY . .
WORKDIR "/src/Prime.Api"
RUN dotnet build "Prime.Api.csproj" -c Release -o /app/build

# Build frontend - copy package files first for better caching
WORKDIR /src/prime-web
COPY ["prime-web/package.json", "prime-web/package-lock.json*", "./"]
RUN npm ci
COPY ["prime-web/", "./"]
RUN npm run build

FROM build AS publish
WORKDIR /src/Prime.Api
RUN dotnet publish "Prime.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
COPY --from=build /src/prime-web/dist ./wwwroot
# Use PORT environment variable from Render, default to 8080
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "Prime.Api.dll"]