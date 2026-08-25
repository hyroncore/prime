FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["Prime.Api/Prime.Api.csproj", "Prime.Api/"]
RUN dotnet restore "Prime.Api/Prime.Api.csproj"
COPY . .
WORKDIR "/src/Prime.Api"
RUN dotnet build "Prime.Api.csproj" -c Release -o /app/build

# Build frontend
WORKDIR /src/prime-web
RUN npm ci
RUN npm run build

FROM build AS publish
RUN dotnet publish "Prime.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
COPY --from=build /src/prime-web/dist ./wwwroot
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "Prime.Api.dll"]