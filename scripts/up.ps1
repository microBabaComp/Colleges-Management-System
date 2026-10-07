param([switch]$DatabaseOnly)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Docker is not installed. Install Docker Desktop with the WSL2 Linux container engine, then retry." }
  $secretDir = Join-Path $root ".secrets"
  New-Item -ItemType Directory -Force -Path $secretDir | Out-Null
  $account = "$($env:USERDOMAIN)\$($env:USERNAME)"
  & icacls.exe $secretDir /inheritance:r /grant:r "$($account):(OI)(CI)F" "*S-1-5-18:(OI)(CI)F" "*S-1-5-32-544:(OI)(CI)F" /T /C | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not restrict local secret-file permissions." }
  $createdToken = $false
  foreach ($name in @("db_password","bootstrap_token")) {
    $path = Join-Path $secretDir $name
    if (-not (Test-Path -LiteralPath $path)) {
      $bytes = [byte[]]::new(48)
      [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
      $value = [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+","-").Replace("/","_")
      [IO.File]::WriteAllText($path,$value,[Text.UTF8Encoding]::new($false))
      if ($name -eq "bootstrap_token") { $createdToken = $true; $bootstrapToken = $value }
    }
  }
  if ($DatabaseOnly) {
    docker compose up -d db
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL could not start." }
    Write-Host "PostgreSQL is running for local development."
  } else {
    docker compose up --build -d
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose could not start the services." }
    Write-Host "CollegeOS is running at http://localhost:8080"
  }
  if ($createdToken) { Write-Host "One-time setup token (keep private): $bootstrapToken" }
  elseif ($DatabaseOnly) { Write-Host "Installer token is stored in .secrets/bootstrap_token" }
} finally { Pop-Location }
