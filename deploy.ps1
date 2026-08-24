param(
    [string]$ServerHost = '192.168.1.12',
    [string]$ServerUser = 'ASEC_AUTOMATION_LY',
    [string]$ServerPass,
    [string]$RemoteProjectDir = 'C:\Users\ASEC_AUTOMATION_LY\Desktop\Prime.Api'
)

if (-not $ServerPass) {
    Write-Host 'Usage: .\deploy.ps1 -ServerPass "password" [-ServerHost 192.168.1.4] [-ServerUser ASEC_AUTOMATION_LY]' -ForegroundColor Yellow
    exit 1
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$share = "\\$ServerHost\Users"
$remoteRelative = $RemoteProjectDir.Replace('C:\Users', '')
$remoteProject = "$share$remoteRelative"
$backupDir = Join-Path $repoRoot 'db-backups'

function Step($msg) {
    Write-Host "`n=== $msg ===" -ForegroundColor Cyan
}

function Fail($msg) {
    Write-Host "FAILED: $msg" -ForegroundColor Red
    exit 1
}

Step '1/5 Gate: backend tests'
Push-Location (Join-Path $repoRoot 'tests\Prime.Api.Tests')
dotnet test --nologo -v q 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'dotnet test failed - do not ship broken code' }
Pop-Location

Step '2/5 Build frontend + copy into wwwroot'
Push-Location (Join-Path $repoRoot 'prime-web')
cmd /c "npm run build" | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'npm run build failed' }
Copy-Item -Recurse -Force .\dist\* ..\Prime.Api\wwwroot\
Pop-Location

Step '3/5 Connect to server share'
try {
    $pass = ConvertTo-SecureString $ServerPass -AsPlainText -Force
    $cred = New-Object System.Management.Automation.PSCredential($ServerUser, $pass)
    New-PSDrive -Name srv -PSProvider FileSystem -Root $share -Credential $cred -ErrorAction Stop | Out-Null
    Write-Host "connected: $share"
} catch {
    Fail "share connection failed - $($_.Exception.Message)"
}

Step '4/5 Backup server db + copy source'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
if (Test-Path "$remoteProject\prime.db") {
    Copy-Item "$remoteProject\prime.db" (Join-Path $backupDir "prime.db-$(Get-Date -Format yyyyMMdd-HHmmss)")
    Write-Host "DB backed up to db-backups"
}
robocopy (Join-Path $repoRoot 'Prime.Api') $remoteProject /MIR /XD uploads bin obj .vs /XF prime.db prime.db-wal prime.db-shm /NFL /NDL /NJH /NJS /NP
if ($LASTEXITCODE -ge 8) { Fail "robocopy failed with code $LASTEXITCODE" }

Step '5/5 Verify'
$files = (Get-ChildItem $remoteProject -Recurse -File | Measure-Object).Count
Write-Host "OK - $files files on server" -ForegroundColor Green
Remove-PSDrive srv -ErrorAction SilentlyContinue

Write-Host "`nDeploy complete. Restart on the server:" -ForegroundColor Green
Write-Host "  Ctrl+C" -ForegroundColor Green
Write-Host "  cd C:\Users\ASEC_AUTOMATION_LY\Desktop\Prime.Api" -ForegroundColor Green
Write-Host "  dotnet run -c Release" -ForegroundColor Green
Write-Host "Then open: http://$ServerHost`:5080" -ForegroundColor Green